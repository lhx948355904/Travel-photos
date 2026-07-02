import { useCallback, useState, memo, useRef, useMemo } from "react";
import { debounce, throttle } from "lodash";

const Child = memo(
  function Child({ onSave }) {
    console.log("Child render");
    return <button onClick={onSave}>保存</button>;
  },
  (a, b) => {
    console.log(a, b);
    return false;
  },
);

export default function Test() {
  const [count, setCount] = useState(0);

  //   const handleSave = useCallback(() => {
  //     console.log("save");
  //   }, []);

  const handleSave = () => {
    console.log("save");
  };

  const debouncee = (fn, time, isNow = false) => {
    let timeout = null;

    return function (...args) {
      clearTimeout(timeout);
      console.log(timeout);
      if (isNow) {
        let _isNow = !timeout;
        timeout = setTimeout(() => {
          timeout = null;
        }, time);
        if (_isNow) {
          fn.apply(this, args);
        }
      } else {
        timeout = setTimeout(fn, time);
      }
    };
  };

  //   const debounce = (func, wait, ...args) => {
  //     let timeout;
  //     return function () {
  //       const context = this;
  //       if (timeout) cleatTimeout(timeout);
  //       let callNow = !timeout;
  //       timeout = setTimeout(() => {
  //         timeout = null;
  //       }, wait);

  //       if (callNow) func.apply(context, args);
  //     };
  //   };

  const add = (num) => {
    console.log("add");
    setCount((count) => count + num);
  };

  const debounce = (fn, time, option = { leading: false, trailing: true }) => {
    const { leading, trailing } = option;
    let timer = null;
    return function (...args) {
      const content = this;
      clearTimeout(timer);
      if (leading) {
        const _now = !timer;
        timer = setTimeout(() => {
          fn.apply(content, args);
          timer = null;
        }, time);
        if (_now) {
          fn.apply(content, args);
        }
      } else {
        timer = setTimeout(() => {
          fn.apply(content, args);
        }, time);
      }
    };
  };

  const throttle = (fn, time, option = { leading: true, trailing: false }) => {
    const { leading, trailing } = option;
    let lastTime = null;
    let timer = null;
    return function (...args) {
      const content = this;
      const now = Date.now();
      if (trailing && leading) {
        clearTimeout(timer);
      }
      if (now - lastTime > time) {
        if (leading) {
          fn.apply(content, args);
        }
        if (trailing) {
          clearTimeout(timer);
          timer = setTimeout(() => {
            fn.apply(content, args);
          }, time);
        }
        lastTime = now;
      }
    };
  };

  const func = useMemo(
    () => throttle(add, 1000, { leading: true, trailing: true }),
    [],
  );

  return (
    <>
      <button onClick={() => func(3)}>按钮{count}</button>
    </>
  );
}
