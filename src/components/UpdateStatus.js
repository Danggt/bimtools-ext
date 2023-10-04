import React, { useEffect, useState } from "react";
import axios, { AxiosError, AxiosResponse } from "axios";
import * as XLSX from "xlsx";
import * as WorkspaceAPI from "trimble-connect-workspace-api";
import { Layout, Button, message, Input } from "antd";

const { Content } = Layout;
const sessionStorage = require("node-sessionstorage");

const UpdateStatus = () => {
  const [event, setEvent] = useState();
  const [data, setData] = useState();
  const [api, setApi] = useState();
  const [guids, setGuids] = useState([]);
  const [rows, setRows] = useState([]);
  const [accesstoken, setAccesstoken] = useState();
  const [sharingtoken, setSharingtoken] = useState();
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

  const updateStatusHandle = () => {
    if (
      typeof rows === "undefined" ||
      rows.length === 0 ||
      typeof data === "undefined"
    )
      return;
    if (event !== "viewer.onSelectionChanged") return;
    console.log(api);
    console.log(accesstoken)
    const url = `https://northamerica.tcstatus.tekla.com/statusapi/1.0`;
    axios
      .post(
        `${url}/auth/token`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accesstoken}`,
          },
        }
      )
      .then((res) => {
        console.log(res)
        setSharingtoken(() => res.data);
      });

    api.then((tcapi) => {
      const modelId = data.data[0].modelId;
      const objectRuntimeIds = [...data.data[0].objectRuntimeIds];
      //console.log(`${url}/projects/${modelId}/statusactions`);
      console.log(sharingtoken);

      // axios
      //   .get(`${url}/projects/PdoQoPPQr-Q/statusactions`, {
      //     headers: {
      //       Authorization: `Bearer ${sharingtoken}`,
      //     },
      //   })
      //   .then((res) => {
      //     console.log(res);
      //   });
      tcapi.viewer
        .convertToObjectIds(modelId, objectRuntimeIds)
        .then((result) => {
          setGuids([...result]);
        });

      tcapi.viewer
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
              });
            });
          });
        });
      console.log(rows);
      console.log(guids);
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
          <Input value={accesstoken} onChange={(e)=>setAccesstoken(e.target.value)} />
          <Button
            type="primary"
            onClick={() => {
              api.then((tcapi) => {
                tcapi.extension.getPermission("accesstoken").then((result) => {
                  window.parent.sessionStorage.setItem("ext_token", result);
                });
              });
            }}
          >
            Get AccessToken
          </Button>
          <Button type="primary" onClick={updateStatusHandle}>
            Update Status
          </Button>
        </div>
      </Content>
    </Layout>
  );
};

export default UpdateStatus;
