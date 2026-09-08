import { Button, Input, Space } from "antd";
import React, { useCallback, useEffect, useRef, useState } from "react";

const SubmitMsg = ({ onSubmit, count }) => {
    // 服务器比对时间，确保倒计时准确
    // 安全、业务严禁（内存泄漏，清除定时器）、UI compact
  const [count, setCount] = useState(3);
  const timer = useRef<number>();

  const getMsg = () => {
    if (timer.current) {
      return;
    }
    timer.current = setInterval(() => timerFn(), 1000);
    onSubmit?.();
  };

  useEffect(() => {
    return () => {
      clearInterval(timer.current);
      timer.current = undefined;
    };
  }, [timer.current]);

  const timerFn = useCallback(() => {

    const fn = () => {
      setCount((msg) => {
        if (msg === 0) {
          clearInterval(timer.current);
          timer.current = undefined;
        } else {
          return msg - 1;
        }
      });
    };
    fn();
  }, [count]);

  return (
    <div>
      <Space>
        <Button disabled={timer.current !== undefined} onClick={getMsg}>
          获取验证码
        </Button>
        <Input placeholder="请输入验证码" />
        <span>{count}</span>
      </Space>
    </div>
  );
};

export default SubmitMsg;
