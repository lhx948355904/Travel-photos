import { useState } from "react";
import Modal from "./Modal";

const Test = () => {
  const [visible, setVisible] = useState(false);

  const handleSuccess = () => {
    Modal.success({
      title: "操作成功",
      content: "您的操作已成功完成",
      okText: "知道了",
      onOk: () => {
        console.log("Success modal closed");
      },
    });
  };

  const handleInfo = () => {
    Modal.info({
      title: "提示信息",
      content: "这是一条重要的提示信息",
    });
  };

  const handleWarning = () => {
    Modal.warning({
      title: "警告",
      content: "您的操作可能会导致数据丢失",
    });
  };

  const handleError = () => {
    Modal.error({
      title: "操作失败",
      content: "抱歉，操作未能完成，请重试",
    });
  };

  const handleConfirm = () => {
    Modal.confirm({
      title: "确认删除",
      content: "删除后无法恢复，确定继续吗？",
      okText: "删除",
      cancelText: "取消",
      onOk: () => {
        console.log("Confirmed!");
      },
      onCancel: () => {
        console.log("Cancelled");
      },
    });
  };

  return (
    <div style={{ padding: "40px", maxWidth: "600px", margin: "0 auto" }}>
      <h1>Modal 组件测试</h1>
      <p style={{ marginBottom: "30px" }}>测试静态方法调用和传统组件用法</p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "40px",
        }}
      >
        <button
          onClick={handleSuccess}
          style={{ padding: "8px 16px", cursor: "pointer" }}
        >
          Modal.success
        </button>
        <button
          onClick={handleInfo}
          style={{ padding: "8px 16px", cursor: "pointer" }}
        >
          Modal.info
        </button>
        <button
          onClick={handleWarning}
          style={{ padding: "8px 16px", cursor: "pointer" }}
        >
          Modal.warning
        </button>
        <button
          onClick={handleError}
          style={{ padding: "8px 16px", cursor: "pointer" }}
        >
          Modal.error
        </button>
        <button
          onClick={handleConfirm}
          style={{ padding: "8px 16px", cursor: "pointer" }}
        >
          Modal.confirm
        </button>
      </div>

      <h2>传统组件用法</h2>
      <button
        onClick={() => setVisible(true)}
        style={{ padding: "8px 16px", cursor: "pointer", marginBottom: "10px" }}
      >
        打开弹窗
      </button>
      <Modal
        title="弹窗标题"
        visible={visible}
        footer={null}
        onOk={() => setVisible(false)}
        onCancel={() => setVisible(false)}
      >
        <div>弹窗内容</div>
      </Modal>
    </div>
  );
};

export default Test;
