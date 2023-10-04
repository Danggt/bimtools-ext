import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import * as WorkspaceAPI from "trimble-connect-workspace-api";
import { Layout, Button, message } from "antd";

const { Content } = Layout;

const UpdateStatus = () => {
  const [event, setEvent] = useState();
  const [data, setData] = useState();
  const [api, setApi] = useState();
  const [guids, setGuids] = useState([]);
  const [asmMarks, setAsmMarks] = useState([]);
  useEffect(() => {
    const api = WorkspaceAPI.connect(window.parent, (event, data) => {
      setEvent(event);
      setData(data);
    });
    setApi(api);
  }, []);
  const updateStatusHandle = () => {
    if (event !== "viewer.onSelectionChanged") return;
    api.then((viewerapi) => {
      const modelId = data.data[0].modelId;
      const objectRuntimeIds = [...data.data[0].objectRuntimeIds];
      viewerapi.viewer
        .convertToObjectIds(modelId, objectRuntimeIds)
        .then((result) => {
          setGuids([...result]);
        });
      viewerapi.viewer
        .getObjectProperties(modelId, objectRuntimeIds)
        .then((result) => {
          result.forEach((element) => {
            const index = result.indexOf(element);
            element.properties.forEach((property) => {
              if (property.name !== "Tekla Assembly") return;
              property.properties.forEach((item) => {
                if (item.name !== "Assembly/Cast unit Mark") return;
                const asm_mark = item.value;
                const guid_ifc = guids[index];
              });
            });
          });
        });
      console.log(guids);
    });
  };
  return (
    <Layout style={{ backgroundColor: "#ffffff" }}>
      <Content style={{ padding: "10px" }}>
        <div>
          <input
            type="file"
            onChange={(event) => {
              const file = event.target.files[0];
              const reader = new FileReader();
              reader.onload = (e) => {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const excelData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
                console.log(excelData);
            }}}
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
          <Button type="primary" onClick={updateStatusHandle}>
            Update Status
          </Button>
        </div>
      </Content>
    </Layout>
  );
};

export default UpdateStatus;
