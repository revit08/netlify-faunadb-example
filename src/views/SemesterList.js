import React, { Component } from "react";
import classnames from "classnames";
import FileBase64 from "react-file-base64";
import { ToastsContainer, ToastsStore } from "react-toasts";
import {
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  Row,
  Col,
  Card,
  CardBody,
  TabContent,
  TabPane,
  Nav,
  NavItem,
  NavLink,
  Container,
  Input,
  FormGroup,
  ButtonGroup,
} from "reactstrap";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/dist/styles/ag-grid.css";
import "ag-grid-community/dist/styles/ag-theme-alpine.css";

import CKEditor from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";

import CellLinkRenderer from "../components/grid/cellLinkRender";
import api from "../utils/api";

import { inputAll } from "../constants/Format";

import {
  gridConfigure,
  gridStudConfigure,
  getRecordID,
  getGridData,
  downloadExcelFormat,
  getListData,
  responseValidator,
  getFieldClass,
} from "../utils/grid";
export default class SemesterList extends Component {
  constructor(props) {
    super(props);

    this.state = {
      todos: [],
      cardview: false,
      context: { componentParent: this },

      itemModInfo: JSON.parse(JSON.stringify(inputAll.Semester)),
      itemModView: false,
      itemModTab: 1,
      columnDefs: gridConfigure(inputAll.Semester),
      columnSubDefs: gridStudConfigure(inputAll.Subjects),
      getRowHeight: function (params) {
        return 40;
      },
      defaultColDef: {
        sortable: true,
        filter: true,
      },
      frameworkComponents: {
        CellLinkRenderer,
      },
      gridParams: {},
      gridSubjParams: {},
      itemList: [],
      itemGrid: [],
    };

    this.onInputChange = this.onInputChange.bind(this);
  }

  componentDidMount() {
    api.readAllSemesters().then((itemList) => {
      responseValidator(itemList);
      const optimisedData = [];
      if (itemList.length > 0) {
        itemList.forEach(function (item, index) {
          let itemis = item.data;
          itemis.id = getRecordID(item);
          optimisedData.push(itemis);
        });
        this.setState({
          itemList: getListData(optimisedData, inputAll.Semester),
          itemGrid: getGridData(optimisedData, inputAll.Semester),
        });
      }
    });
  }
  toggle = () => {
    const { itemModView } = this.state;
    this.setState({
      itemModView: !itemModView,
    });
  };

  saveItem = () => {
    const { itemModInfo, gridSubjParams } = this.state;
    // itemModInfo.ts = new Date().getTime() * 10000;
    const updateApiArr = JSON.parse(JSON.stringify(itemModInfo.data));
    const updateApiData = {};

    const newGridCodes = [];
    gridSubjParams.api.forEachNode((node, index) => {
      const newNode = JSON.parse(JSON.stringify(node.data));
      const { value } = newNode;
      if (value) {
        newNode.value = value.toString().trim();
      }
      newNode.serial = index + 1;
      console.log(newNode);
      newGridCodes.push(newNode);
    });
    console.log(newGridCodes);

    updateApiArr.forEach(function (item) {
      if (item.tab !== "pic") {
        item.list.forEach(function (field) {
          delete field["id"];
          delete field["type"];
        });
      }

      updateApiData[item.tab] = item.list;
      updateApiData.modified = new Date().getTime() * 10000;
    });
    updateApiData.subjects = newGridCodes;
    console.log(updateApiData);
    if (itemModInfo.id) {
      api
        .updateSemester(itemModInfo.id, updateApiData)
        .then(() => {
          ToastsStore.success(`Semester Changes Updated!`);
        })
        .catch((e) => {
          ToastsStore.error(`Semester Update Failed!`);
        });
    } else {
      updateApiData.created = new Date().getTime() * 10000;
      api
        .createSemester(updateApiData)
        .then((response) => {
          ToastsStore.success(`Semester Created Succesfully!`);
        })
        .catch((e) => {
          ToastsStore.error(`Semester Creation Failed!`);
        });
    }
  };
  deleteSemester = (e) => {
    const { itemList } = this.state;
    const replistId = e.target.dataset.id;

    // Optimistically remove replist from UI
    const filteredSemesters = itemList.reduce(
      (acc, current) => {
        const currentId = getRecordID(current);
        if (currentId === replistId) {
          acc.rollbackSemester = current;
          return acc;
        }
        // filter deleted replist out of the itemList list
        acc.optimisticState = acc.optimisticState.concat(current);
        return acc;
      },
      {
        rollbackSemester: {},
        optimisticState: [],
      }
    );

    this.setState({
      itemList: filteredSemesters.optimisticState,
    });

    // Make API request to delete replist
    api
      .deleteSemester(replistId)
      .then(() => {
        ToastsStore.success(`deleted replist id ${replistId}`);
      })
      .catch((e) => {
        ToastsStore.success(`There was an error removing ${replistId}`, e);
        this.setState({
          itemList: filteredSemesters.optimisticState.concat(
            filteredSemesters.rollbackSemester
          ),
        });
      });
  };

  newitemModView = () => {
    const itemDoc = {
      data: JSON.parse(JSON.stringify(inputAll.Semester)),
    };

    this.setState({
      itemModInfo: itemDoc,
    });
    this.setState({
      itemModView: true,
    });
  };

  openUserModal = (id) => {
    const itemDoc = this.state.itemList.find((o) => o.id === id);
    //const itemDoc = JSON.parse(JSON.stringify(inputAll.Semester));

    this.setState({
      itemModInfo: itemDoc,
    });
    this.setState({
      itemModView: true,
    });
  };

  onInputChange = (tab, name, value) => {
    const { itemModInfo } = this.state;

    var ind = itemModInfo.data[tab].list.findIndex((x) => x.field === name);
    if (ind >= 0) {
      itemModInfo.data[tab].list[ind].val = value;
    }
    this.setState({ itemModInfo });
  };

  onEditorStateChange = (tab, name, value) => {
    const { itemModInfo } = this.state;

    var ind = itemModInfo.data[tab].list.findIndex((x) => x.field === name);
    if (ind >= 0) {
      itemModInfo.data[tab].list[ind].val = value;
    }
    this.setState({ itemModInfo });
  };

  fileChangedHandler = (files) => {
    const { itemModInfo } = this.state;
    if (files.size) {
      const fileSize = files.size.replace("kB", "").trim();

      if (Number(fileSize) > 1000) {
        ToastsStore.error("Upload Image less than 1 MB");
      } else {
        var ind = itemModInfo.data.findIndex((x) => x.tab === "pic");
        itemModInfo.data[ind].list = [];
        itemModInfo.data[ind].list.push(files);
        this.setState({ itemModInfo, src: files });
        ToastsStore.success(`${files.name} updated as profile image`);
      }
    }
  };
  toggleTabs = (e, stateName, index) => {
    e.preventDefault();
    this.setState({
      [stateName]: index,
    });
  };
  download = () => {
    const { gridParams } = this.state;
    const params = {
      fileName: "Revit2k8-Semesters",
      sheetName: "Semesters",
      processCellCallback(paramsl) {
        return downloadExcelFormat(paramsl);
      },
    };

    gridParams.api.exportDataAsCsv(params);
  };
  setParams = (params) => {
    if (params) {
      this.setState({ gridParams: params });

      try {
        params.api.setSuppressClipboardPaste(false);
        params.api.copySelectedRowsToClipboard(false);
        params.api.closeToolPanel();
      } catch (e) {
        // this will run only if the code in the try block errors-out
      }
    }
  };
  setSubParams = (sparams) => {
    if (sparams) {
      this.setState({ gridSubjParams: sparams });
      console.log(sparams);
      try {
        sparams.api.setSuppressClipboardPaste(false);
        sparams.api.copySelectedRowsToClipboard(false);
        sparams.api.closeToolPanel();
      } catch (e) {
        // this will run only if the code in the try block errors-out
      }
    }
  };
  addNewSubject = () => {
    const { gridSubjParams } = this.state;
    const CurrentGridData = [];
    gridSubjParams.api.forEachNode((node) => CurrentGridData.push(node.data));
    let newIndex = CurrentGridData.length;
    const newRcode = {
      basic_sName: "",
      basic_sCode: "",
      basic_sDesc: "",
      basic_sTaff: "",
    };
    gridSubjParams.api.updateRowData({ add: [newRcode], addIndex: newIndex });

    gridSubjParams.api.setFocusedCell(newIndex, "basic_sName");
    gridSubjParams.api.startEditingCell({
      rowIndex: newIndex,
      colKey: "basic_sName",
    });
  };
  render() {
    const { itemModInfo } = this.state;
    // console.log(itemModInfo);
    return (
      <>
        <Container className="pt-3" fluid>
          <ToastsContainer store={ToastsStore} />
          <div className="container">
            <div className="row">
              <Col md="12">
                <Card className="card-coin card-plain">
                  <CardBody>
                    <div
                      style={{ height: "70vh", width: "100%" }}
                      className="ag-theme-alpine"
                    >
                      <Row className="align-items-center pb-2">
                        <div className="col">
                          <h4 className="mb-0">Semesters List</h4>
                        </div>
                        <div className="col text-right">
                          <ButtonGroup size="sm">
                            <Button onClick={this.newitemModView}>
                              <i className="fa fa-plus"></i> ADD
                            </Button>
                            <Button onClick={this.download}>
                              <i className="fa fa-download"></i> DOWNLOAD
                            </Button>
                          </ButtonGroup>
                        </div>
                      </Row>
                      <AgGridReact
                        columnDefs={this.state.columnDefs}
                        defaultColDef={this.state.defaultColDef}
                        floatingFilter={true}
                        rowData={this.state.itemGrid}
                        getRowHeight={this.state.getRowHeight}
                        context={this.state.context}
                        frameworkComponents={this.state.frameworkComponents}
                        onGridReady={this.setParams}
                      ></AgGridReact>
                      <br />
                    </div>
                    <br /> <br /> <br />
                  </CardBody>
                </Card>
              </Col>
            </div>
          </div>

          <Modal
            isOpen={this.state.itemModView}
            toggle={this.toggle}
            className="modal-lg lg"
          >
            <ModalHeader toggle={this.toggle} className="h2">
              Semester
            </ModalHeader>
            <ModalBody>
              <form
                className="todo-create-wrapper"
                onSubmit={(e) => {
                  e.preventDefault();
                  this.saveItem();
                }}
              >
                <Container fluid>
                  <Row>
                    <Col md="12">
                      {/*nav Menu*/}
                      <Nav className="nav-tabs-info" role="tablist" tabs>
                        {itemModInfo &&
                          itemModInfo.data &&
                          itemModInfo.data.length > 0 &&
                          itemModInfo.data.map((tab, i) => (
                            <NavItem key={`nabtabmenu${i}`}>
                              <NavLink
                                className={classnames({
                                  active: this.state.itemModTab === i + 1,
                                })}
                                onClick={(e) =>
                                  this.toggleTabs(e, "itemModTab", i + 1)
                                }
                              >
                                {tab.name}
                              </NavLink>
                            </NavItem>
                          ))}
                      </Nav>
                      {/** */}
                      <TabContent
                        className="tab-space"
                        activeTab={"link" + this.state.itemModTab}
                      >
                        {itemModInfo &&
                          itemModInfo.data &&
                          itemModInfo.data.length > 0 &&
                          itemModInfo.data.map((tab, i) => (
                            <TabPane
                              tabId={"link" + (i + 1)}
                              key={`nabtabcontent${i}`}
                            >
                              <Container fluid className="pt-3">
                                <Row>
                                  {tab.tab !== "pic" &&
                                    tab.tab !== "subjects" &&
                                    tab.list.map((tbli, j) => (
                                      <Col
                                        className={getFieldClass(tbli.type)}
                                        key={`formContent${j}`}
                                      >
                                        <FormGroup>
                                          <label className="form-label">
                                            {tbli.name || ""}
                                          </label>
                                          {tbli.type !== "textarea" && (
                                            <Input
                                              type={tbli.type}
                                              value={tbli.val || ""}
                                              name={tbli.field || ""}
                                              onChange={(e) =>
                                                this.onInputChange(
                                                  i,
                                                  e.target.name,
                                                  e.target.value
                                                )
                                              }
                                            />
                                          )}
                                          {tbli.type === "textarea" && (
                                            <CKEditor
                                              editor={ClassicEditor}
                                              data={tbli.val || ""}
                                              onInit={(editor) => {
                                                // You can store the "editor" and use when it is needed.
                                                console.log(
                                                  "Editor is ready to use!",
                                                  editor
                                                );
                                              }}
                                              onChange={(event, editor) => {
                                                const data = editor.getData();
                                                this.onInputChange(
                                                  i,
                                                  tbli.field,
                                                  data
                                                );
                                                console.log({
                                                  event,
                                                  editor,
                                                  data,
                                                });
                                              }}
                                              onBlur={(event, editor) => {
                                                console.log("Blur.", editor);
                                              }}
                                              onFocus={(event, editor) => {
                                                console.log("Focus.", editor);
                                              }}
                                            />
                                          )}{" "}
                                        </FormGroup>
                                      </Col>
                                    ))}
                                  {tab.tab === "pic" && (
                                    <div className="cmsImageDiv">
                                      <div className="cmsUploadimage">
                                        Upload Image.
                                        <FileBase64
                                          multiple={false}
                                          onDone={this.fileChangedHandler.bind(
                                            this
                                          )}
                                        />
                                      </div>

                                      {tab.list &&
                                        tab.list.length > 0 &&
                                        tab.list[0].base64 && (
                                          <img
                                            alt="profilepic"
                                            className="img-fluid"
                                            src={`${tab.list[0].base64}`}
                                          />
                                        )}
                                    </div>
                                  )}
                                  {tab.tab === "subjects" && (
                                    <div class="container-fluid">
                                      <Button onClick={this.addNewSubject}>
                                        <i className="fa fa-plus"></i> ADD
                                      </Button>{" "}
                                      <div
                                        style={{
                                          height: "70vh",
                                          width: "100%",
                                        }}
                                        className="ag-theme-alpine"
                                      >
                                        <AgGridReact
                                          columnDefs={this.state.columnSubDefs}
                                          defaultColDef={
                                            this.state.defaultColDef
                                          }
                                          floatingFilter={true}
                                          rowData={tab.list}
                                          onGridReady={this.setSubParams}
                                          enableCellChangeFlash={true}
                                          rowDragManaged={true}
                                          animateRows={true}
                                        ></AgGridReact>
                                      </div>
                                    </div>
                                  )}
                                </Row>
                              </Container>
                            </TabPane>
                          ))}
                      </TabContent>
                    </Col>
                  </Row>
                  <hr />
                  <button className="btn btn-info">Create / Update</button>
                </Container>
              </form>{" "}
            </ModalBody>
          </Modal>
        </Container>
      </>
    );
  }
}
