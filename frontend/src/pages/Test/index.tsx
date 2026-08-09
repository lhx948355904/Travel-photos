import React, { useState, useTransition, useEffect, useRef } from "react";

const TestPage = () => {
  const [username, setUsername] = useState("");
  const [isPending, setIsPending] = useTransition();
  const [keyword, setKeyword] = useState("");
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // 创建 Worker
    const worker = new Worker(new URL("./test.js", import.meta.url));
    workerRef.current = worker;

    worker.onmessage = (event) => {
      setKeyword(event.data);
    };

    // 清理函数：组件卸载时终止 Worker
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setUsername(value);
    setIsPending(() => {
      setKeyword(value);
    });
    // 发送消息到 Worker
    workerRef.current?.postMessage(value);
  };

  return (
    <div>
      <input onChange={handleChange} />
      {username}
      {isPending ? <span>正在更新列表</span> : keyword}
      <button>提交</button>
    </div>
  );
};

export default TestPage;
