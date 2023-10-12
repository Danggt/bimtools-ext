import React, { useEffect, useState } from "react";
import axios, { AxiosError, AxiosResponse } from "axios";
import * as XLSX from "xlsx";
import * as WorkspaceAPI from "trimble-connect-workspace-api";
import { Layout, Button, message, Input, Form } from "antd";
import { Format } from "../services/GUIDConversion";

const { Content } = Layout;

const UpdateStatus = () => {
  const [event, setEvent] = useState();
  const [data, setData] = useState();
  const [api, setApi] = useState();
  const [guids, setGuids] = useState([]);
  const [rows, setRows] = useState([]);
  const [accesstoken, setAccesstoken] = useState();
  const [projectId, setProjectId] = useState();
  const [projectName, setProjectName] = useState();
  useEffect(() => {
    const api = WorkspaceAPI.connect(window.parent, (event, data) => {
      setEvent(event);
      setData(data);
      // console.log(event);
      // console.log(data);
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
    //Get current project
    api.then((tcapi) => {
      tcapi.project.getProject().then((result) => {
        setProjectId(result.id);
      });
    });
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

    //Get action status
    const res_statuses = await axios.get(
      `https://europe.tcstatus.tekla.com/statusapi/1.0/projects/${projectId}/statusactions`,
      {
        headers: {
          Authorization: `Bearer ${status_token}`,
        },
      }
    );
    const statuses = res_statuses.data;
    console.log(statuses);
    let updated_statuses = [];
    rows.forEach((element) => {
      const guid = element.GUID.trim();
      if (typeof guid === "undefined" || guid === "") return;
      console.log(element.Status);
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
    console.log(updated_statuses);
    await axios
      .post(
        `https://europe.tcstatus.tekla.com/statusapi/1.0/projects/${projectId}/statusevents`,
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
      .catch((ex) => {
        console.log(ex);
        message.error("Update failed");
      });
  };
  const representingStatus = (status) => {
    message.info("Representing in progress..",2.5)
    //console.log(data.data[0].objectRuntimeIds)
    //Get current project
    api.then((tcapi) => {
      tcapi.project.getProject().then((result) => {
        setProjectId(result.id);
      });
    });

    api.then(async (tcapi) => {
      console.log(tcapi)
      const objects = await tcapi.viewer.getObjects();
      console.log(objects)
      objects.forEach(async model => {
        const modelId = model.modelId;
        const objects_id = model.objects.map((x) => x.id);
        console.log(objects_id)

        // tcapi.viewer.setObjectState({
        //   modelObjectIds: [
        //     {
        //       modelId: modelId,
        //       objectRuntimeIds: data.data[0].objectRuntimeIds,
        //     },
        //   ],
        // }, {
        //   color: "#d1cdc7",
        //   visible: true,
        // })

        const external_ids = await tcapi.viewer.convertToObjectIds(
          modelId,
          objects_id
        );
        console.log(external_ids)

        const original_ids = external_ids.map(x => x.replace('$', ''))
        // const properties = await tcapi.viewer.getObjectProperties(
        //   modelId,
        //   data.data[0].objectRuntimeIds
        // );
        // console.log(properties)

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
        //Get action status
        const res_statuses = await axios.get(
          `${url}/projects/${projectId}/statusactions`,
          {
            headers: {
              Authorization: `Bearer ${status_token}`,
            },
          }
        );
        const statuses = res_statuses.data.map((x) => {
          if (x.name === "1) Planning") {
            return {
              id: x.id,
              color: "#F1C40F",
              name: x.name,
            };
          } else if (x.name === "2) In Fabrication") {
            return {
              id: x.id,
              color: "#1ABC9C",
              name: x.name,
            };
          } else if (x.name === "3) In Treatment") {
            return {
              id: x.id,
              color: "#2980B9",
              name: x.name,
            };
          } else if (x.name === "3.1) OSWI Completed") {
            return {
              id: x.id,
              color: "#9B59B6",
              name: x.name,
            };
          } else if (x.name === "4) At Dispatch") {
            return {
              id: x.id,
              color: "#E74C3C",
              name: x.name,
            };
          } else if (x.name === "5) Shipped") {
            return {
              id: x.id,
              color: "#B9770E",
              name: x.name,
            };
          } else if (x.name === "Status1") {
            return {
              id: x.id,
              color: "#25cf0e",
              name: x.name,
            };
          } else if (x.name === "Status2") {
            return {
              id: x.id,
              color: "#cf0e18",
              name: x.name,
            };
          }
        });

        const current_status = statuses.filter(
          (x) => typeof x !== "undefined" && x.name === status
        )[0];
        //Get element statuses
        const res_status = await axios.get(
          `${url}/projects/${projectId}/status?statusActionId=${current_status.id}`,
          {
            headers: {
              Authorization: `Bearer ${status_token}`,
            },
          }
        );
        console.log(res_status.data);
        const ids = res_status.data.map((x) => x.objectId);
        console.log(ids);
        let model_obj_ids = [];
        ids.forEach((id) => {
          const index = original_ids.indexOf(id);
          if (index < 0) return;
          model_obj_ids.push(index);
        });
        console.log(model_obj_ids)

        console.log(current_status);
        // tcapi.viewer.setSelection({
        //   modelObjectIds: [
        //     {
        //       modelId: modelId,
        //       objectRuntimeIds: [2001],
        //     },
        //   ],
        // }, "add")
        tcapi.viewer.setObjectState({
          modelObjectIds: [
            {
              modelId: modelId,
              objectRuntimeIds: model_obj_ids,
            },
          ],
        }, {
          color: current_status.color,
          visible: true,
        })

        // tcapi.viewer.setObjectState(
        //   {
        //     modelObjectIds: [
        //       {
        //         modelId: modelId,
        //         objectRuntimeIds: [2001],
        //         parameter:{
        //           class:'IFCELEMENTASSEMBLY'
        //         }
        //       },
        //     ],
        //   },
        //   {
        //     color: current_status.color,
        //     visible: true,
        //   }
        // );
      })
    });
    message.success("Action has been done",5)
  };

  const resetColor = () => {
    api.then((tcapi) => {
      tcapi.project.getProject().then((result) => {
        setProjectId(result.id);
      });
    });

    api.then(async (tcapi) => {
      console.log(tcapi)
      const objects = await tcapi.viewer.getObjects();
      console.log(objects)
      objects.forEach(async model => {
        const modelId = model.modelId;
        const objects_id = model.objects.map((x) => x.id);
        console.log(objects_id)

        tcapi.viewer.setObjectState({
          modelObjectIds: [
            {
              modelId: modelId,
              objectRuntimeIds: objects_id,
            },
          ],
        }, {
          color: "reset",
        })

      })
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
            {/* <Form.Item label="Model Name">
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
            </Form.Item> */}
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
          <Button
            type="primary"
            style={{ background: "#F1C40F" }}
            onClick={() => representingStatus(`1) Planning`)}
          >{`1) Planning`}</Button>
          <Button
            type="primary"
            style={{ background: "#1ABC9C" }}
            onClick={() => representingStatus(`2) In Fabrication`)}
          >{`2) In Fabrication`}</Button>
          <Button
            type="primary"
            style={{ background: "#2980B9" }}
            onClick={() => representingStatus(`3) In Treatment`)}
          >{`3) In Treatment`}</Button>
          <Button
            type="primary"
            style={{ background: "#9B59B6" }}
            onClick={() => representingStatus(`3.1) OSWI Completed`)}
          >{`3.1) OSWI Completed`}</Button>
          <Button
            type="primary"
            style={{ background: "#E74C3C" }}
            onClick={() => representingStatus(`4) At Dispatch`)}
          >{`4) At Dispatch`}</Button>
          <Button
            type="primary"
            style={{ background: "#B9770E" }}
            onClick={() => representingStatus(`5) Shipped`)}
          >{`5) Shipped`}</Button>
          <Button type="primary" onClick={resetColor}>
            Reset Color
          </Button>
          {/* <Button
            type="primary"
            onClick={() => {
              api.then(async (tcapi) => {
                const a = await tcapi.project.getProject()
                console.log(a)
              });
            }}
          >
            Current Project
          </Button> */}
        </div>
      </Content>
    </Layout>
  );
};

export default UpdateStatus;
