import React, { useEffect, useState } from "react";
import axios, { AxiosError, AxiosResponse } from "axios";
import * as XLSX from "xlsx";
import * as WorkspaceAPI from "trimble-connect-workspace-api";
import { Layout, Button, message, Input, Form } from "antd";
import { async } from "q";
import { Format } from "../services/GUIDConversion";

const { Content } = Layout;

const UpdateStatus = () => {
  const [event, setEvent] = useState();
  const [data, setData] = useState();
  const [api, setApi] = useState();
  const [guids, setGuids] = useState([]);
  const [rows, setRows] = useState([]);
  const [accesstoken, setAccesstoken] = useState();
  const [projectName, setProjectName] = useState();
  useEffect(() => {
    const api = WorkspaceAPI.connect(window.parent, (event, data) => {
      setEvent(event);
      setData(data);
    });
    setApi(api);
  }, []);
  const readExcel = (file) => {
    const promise = new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.readAsArrayBuffer(file);

      fileReader.onload = (e) => {
        const bufferArray = e.target.result;
        const wb = XLSX.read(bufferArray, { type: "buffer" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        resolve(data);
      };

      fileReader.onerror = (error) => {
        reject(error);
      };
    });

    promise.then((d) => {
      setRows(d);
    });
  };

  const updateStatusHandle = async () => {
    if (
      typeof rows === "undefined" ||
      rows.length === 0 ||
      typeof data === "undefined"
    )
      return;
    if (event !== "viewer.onSelectionChanged") return;
    const url = `https://europe.tcstatus.tekla.com/statusapi/1.0`;

    const res_status_token = await axios.post(
      `${url}/auth/token`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accesstoken}`,
        },
      }
    );
    const status_token = res_status_token.data;

    api.then(async (tcapi) => {
      const modelId = data.data[0].modelId;
      const objectRuntimeIds = [...data.data[0].objectRuntimeIds];
      //Get projects
      const res_projects = await axios.get(
        `https://app21.connect.trimble.com/tc/api/2.0/projects?fullyLoaded=true&minimal=true&sort=-name`,
        {
          headers: {
            Authorization: `Bearer ${accesstoken}`,
          },
        }
      );
      const project = res_projects.data.filter(
        (x) => x.name === projectName
      )[0];
      //Get action status
      const res_statuses = await axios.get(
        `https://europe.tcstatus.tekla.com/statusapi/1.0/projects/${project.id}/statusactions`,
        {
          headers: {
            Authorization: `Bearer ${status_token}`,
          },
        }
      );
      const statuses = res_statuses.data;

      const guids = await tcapi.viewer.convertToObjectIds(
        modelId,
        objectRuntimeIds
      );
      let updated_statuses = [];
      await tcapi.viewer
        .getObjectProperties(modelId, objectRuntimeIds)
        .then((result) => {
          result.forEach((element) => {
            const index = result.indexOf(element);
            element.properties.forEach((property) => {
              if (
                property.name !== "Tekla Assembly" &&
                property.name !== "Tekla Baugruppe"
              )
                return;
              property.properties.forEach((item) => {
                if (
                  item.name !== "Assembly/Cast unit Mark" &&
                  item.name !== "Baugruppen-Positionsnummer"
                )
                  return;
                const asm_mark = item.value;
                const guid_ifc = guids[index];
                const items = rows.filter((x) => x.Asm_Mark.includes(asm_mark));
                if (items.length === 0 || typeof guid_ifc === "undefined")
                  return;
                const matched_statuses = statuses.filter((x) =>
                  items[0].Status.includes(x.name)
                );
                if (matched_statuses.length === 0) return;
                console.log({
                  objectId: guid_ifc,
                  statusActionId: matched_statuses[0].id,
                  value: "Completed",
                  valueDate: new Date().toISOString(),
                });
                updated_statuses.push({
                  objectId: guid_ifc,
                  statusActionId: matched_statuses[0].id,
                  value: "Completed",
                  valueDate: new Date().toISOString(),
                });
              });
            });
          });
        });

      const res = await axios.post(
        `https://europe.tcstatus.tekla.com/statusapi/1.0/projects/${project.id}/statusevents`,
        updated_statuses,
        {
          headers: {
            Authorization: `Bearer ${status_token}`,
            "Content-Type": "application/json",
          },
        }
      );
    });
    message.success("Update Status Completed");
  };

  const updateStatusHandle1 = async () => {
    if (
      typeof rows === "undefined" ||
      rows.length === 0 ||
      typeof data === "undefined"
    )
      return;
    const url = `https://europe.tcstatus.tekla.com/statusapi/1.0`;
    const res_status_token = await axios.post(
      `${url}/auth/token`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accesstoken}`,
        },
      }
    );
    const status_token = res_status_token.data;

    //Get projects
    const res_projects = await axios.get(
      `https://app21.connect.trimble.com/tc/api/2.0/projects?fullyLoaded=true&minimal=true&sort=-name`,
      {
        headers: {
          Authorization: `Bearer ${accesstoken}`,
        },
      }
    );
    const project = res_projects.data.filter((x) => x.name === projectName)[0];
    //Get action status
    const res_statuses = await axios.get(
      `https://europe.tcstatus.tekla.com/statusapi/1.0/projects/${project.id}/statusactions`,
      {
        headers: {
          Authorization: `Bearer ${status_token}`,
        },
      }
    );
    const statuses = res_statuses.data;
    let updated_statuses = [];
    rows.forEach((element) => {
      const guid = element.GUID.trim();
      if (typeof guid === "undefined" || guid === "") return;
      const guid_ifc = Format(guid);
      const matched_statuses = statuses.filter((x) =>
        element.Status.includes(x.name)
      );
      if (matched_statuses.length === 0) return;
      updated_statuses.push({
        objectId: guid_ifc,
        statusActionId: matched_statuses[0].id,
        value: "Completed",
        valueDate: new Date().toISOString(),
      });
    });
    console.log(updated_statuses)
    await axios
      .post(
        `https://europe.tcstatus.tekla.com/statusapi/1.0/projects/${project.id}/statusevents`,
        updated_statuses,
        {
          headers: {
            Authorization: `Bearer ${status_token}`,
            "Content-Type": "application/json",
          },
        }
      )
      .then((result) => {
        console.log(result);
        message.success("Status has been updated");
      })
      .then((ex) => {
        console.log(ex);
        message.error("Update failed");
      });
  };
  return (
    <Layout style={{ backgroundColor: "#ffffff" }}>
      <Content style={{ padding: "10px" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            rowGap: "5px",
            columnGap: "5px",
            padding: "5px",
            paddingLeft: "0px",
          }}
        >
          <input
            type="file"
            onChange={(event) => {
              const file = event.target.files[0];
              readExcel(file);
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            rowGap: "5px",
            columnGap: "5px",
          }}
        >
          <Form>
            <Form.Item label="Access Token">
              <Input
                value={accesstoken}
                onChange={(e) => setAccesstoken(e.target.value)}
              />
            </Form.Item>
            <Form.Item label="Model Name">
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
            </Form.Item>
          </Form>
          <Button
            type="primary"
            onClick={() => {
              api.then((tcapi) => {
                tcapi.extension.getPermission("accesstoken").then((result) => {
                  setAccesstoken(result);
                });
              });
            }}
          >
            Get AccessToken
          </Button>
          <Button type="primary" onClick={updateStatusHandle1}>
            Update Status
          </Button>
        </div>
      </Content>
    </Layout>
  );
};

export default UpdateStatus;
