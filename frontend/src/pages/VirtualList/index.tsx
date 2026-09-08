import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import "./index.css";
import { Tabs } from "antd";
import { faker } from "https://esm.sh/@faker-js/faker";
import { debounce, throttle } from "lodash";
const ITEM_HEIGHT = 50;

const FixHeight = () => {
  const [showData, setShowData] = useState<any>([]);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const maxCount = useRef(0);
  const listData = useRef(
    new Array(1000).fill({}).map((_, index) => ({ id: index })),
  );
  const scrollNum = useRef(0);

  useEffect(() => {
    maxCount.current = listContainerRef.current?.clientHeight! / ITEM_HEIGHT;
    setStart(0);
    setEnd(maxCount.current);
  }, []);

  useEffect(() => {
    setShowData(listData.current.slice(start, end));
  }, [start, end]);

  const onScroll = () => {
    const scrollTop = listContainerRef.current?.scrollTop!;
    const start = Math.floor(scrollTop / ITEM_HEIGHT);
    const end = start + maxCount.current;
    setStart(start);
    setEnd(end);
    scrollNum.current = scrollTop;
  };
  return (
    <div>
      <div
        className="list-container"
        ref={listContainerRef}
        onScroll={onScroll}
      >
        <div
          className="phantom"
          style={{ height: listData.current.length * ITEM_HEIGHT + "px" }}
        ></div>
        <div
          className="list-content"
          style={{ transform: `translateY(${scrollNum.current}px)` }}
        >
          {showData.map((item: any) => (
            <div className="list-item" key={item.id}>
              {item.id}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const data = new Array(1000)
      .fill({})
      .map((_, index) => ({ index, text: faker.lorem.sentences() }))

const AutoHeight = () => {
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const maxNum = useRef(0);
  const [scrollNum, setScrollNum] = useState(0);
  const listContentRef = useRef<HTMLDivElement>(null);
  const listData = useRef(
    data
  );
  const listInfo = useRef<any>([]);
  const listInfoRefs = useRef<any>([]);
  const [listItemHeights, setListItemHeights] = useState<any>(
    listData.current.length * ITEM_HEIGHT,
  );

  console.log("listInfo", listInfo.current, start, end);

  useEffect(() => {
    maxNum.current = listContentRef.current?.clientHeight! / ITEM_HEIGHT;
    setStart(0);
    setEnd(Math.min(maxNum.current, listInfo.current.length));
    listInfo.current = listData.current.map((item: any, index) => ({
      index,
      height: ITEM_HEIGHT,
      top: index * ITEM_HEIGHT,
      bottom: (index + 1) * ITEM_HEIGHT,
    }));
  }, []);

  const showData = useMemo(
    () => listData.current.slice(start, end),
    [start, end],
  );

  useLayoutEffect(() => {
    if (showData.length === 0 || listInfo.current.length === 0) {
      return;
    }
    updateListInfos();
    updateScrollNum();
  }, [showData]);

  const updateListInfos = () => {
    listInfoRefs.current.map((v: any) => {
      const current = listInfo.current[Number(v.dataset.index)];
      const diff = v.clientHeight - current.height;
      if (diff) {
        current.height = v.clientHeight;
        current.bottom += diff;
        for (let x = current.index + 1; x < listInfo.current.length; x++) {
          listInfo.current[x].top += diff;
          listInfo.current[x].bottom += diff;
        }
      }
    });
    setListItemHeights(listInfo.current[listInfo.current.length - 1].bottom);
  };

  const updateScrollNum = () => {
    if (showData.length === 0) {
      return;
    }
    setScrollNum(start > 0 ? listInfo.current[start].top : 0);
  };

  const onScroll = () => {
    const scrollTop = listContentRef.current?.scrollTop!;
    const _start = updateStart(scrollTop);
    setStart(_start);
    setEnd(Math.min(_start + maxNum.current, listInfo.current.length));
  };

  const updateStart = (scroll: number) => {
    let start = 0,
      end = listInfo.current.length - 1;
    let middle = 0;
    while (start < end) {
      middle = Math.floor((start + end) / 2);
      const middleElement = listInfo.current[middle];
      if (scroll > middleElement.bottom) {
        start = middle + 1;
      } else if (scroll < middleElement.bottom) {
        end = middle;
      } else if (scroll === middleElement.bottom) {
        return middle;
      }
    }
    return middle;
  };

  return (
    <div>
      <div className="list-container" onScroll={onScroll} ref={listContentRef}>
        <div
          className="phantom"
          style={{ height: `${listItemHeights}px` }}
        ></div>
        <div
          className="list-content"
          style={{ transform: `translateY(${scrollNum}px)` }}
        >
          {showData.map((item: any, index: number) => (
            <div
              className="list-item1"
              key={item.index}
              ref={(el) => {
                listInfoRefs.current[index] = el;
              }}
              data-index={item.index}
            >
              {item.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const index = () => {
  return (
    <>
      <Tabs defaultActiveKey="2">
        <Tabs.TabPane tab="固定高度" key="1">
          <FixHeight />
        </Tabs.TabPane>
        <Tabs.TabPane tab="自适应高度" key="2">
          <AutoHeight />
        </Tabs.TabPane>
      </Tabs>
    </>
  );
};

export default index;
