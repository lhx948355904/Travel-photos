import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import "./index.css";
import { Tabs } from "antd";
// @ts-ignore
import { faker } from "https://esm.sh/@faker-js/faker";

const ITEM_HEIGHT = 50;

const dataFixHeight = new Array(1000)
  .fill({})
  .map((_, index) => ({ id: index }));

const FixHeight = () => {
  // 开始结束下标
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  // 可视区域容器ref
  const listContainerRef = useRef<HTMLDivElement>(null);
  // 最大显示数量
  const maxCount = useRef(0);
  // 列表全量数据
  const listData = useRef(dataFixHeight);
  // 滚动距离
  const scrollNum = useRef(0);

  // 初始化时，设置最大显示数量
  useEffect(() => {
    maxCount.current =
      listContainerRef.current?.clientHeight! / ITEM_HEIGHT + 1;
    setStart(0);
    setEnd(maxCount.current);
  }, []);

  // 实际展示数据
  const showData = useMemo(
    () => listData.current.slice(start, end),
    [start, end],
  );

  const onScroll = () => {
    const scrollTop = listContainerRef.current?.scrollTop!;
    // 重新计算开始结束下标
    const start = Math.floor(scrollTop / ITEM_HEIGHT);
    const end = start + maxCount.current;
    setStart(start);
    setEnd(end);
    // 更新滚动距离
    scrollNum.current = scrollTop;
  };
  return (
    <div>
      {/* 可视区域容器 */}
      <div
        className="list-container"
        ref={listContainerRef}
        onScroll={onScroll}
      >
        {/* 撑开可视区的高度占位元素 */}
        <div
          className="phantom"
          style={{ height: listData.current.length * ITEM_HEIGHT + "px" }}
        />
        {/* 列表内容容器 */}
        <div
          className="list-content"
          // 需要平移内容区域 到 可视窗口的位置
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
};;

const data = new Array(1000)
  .fill({})
  .map((_, index) => ({ index, text: faker.lorem.sentences() }));

const AutoHeight = () => {
  // 开始结束下标
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  // 最大显示数量
  const maxNum = useRef(0);
  // 滚动距离
  const [scrollNum, setScrollNum] = useState(0);
  // 列表内容容器ref
  const listContentRef = useRef<HTMLDivElement>(null);
  // 列表全量数据
  const listData = useRef(data);
  // 全量数据属性值，包含index，height，top，bottom
  const listInfo = useRef<any>([]);
  // 渲染数据绑定ref，为了获取到真实高度
  const listInfoRefs = useRef<any>([]);
  // 占位元素高度
  const [listItemHeights, setListItemHeights] = useState<any>(
    listData.current.length * ITEM_HEIGHT,
  );

  console.log("listInfo", listInfo.current, start, end);

  useEffect(() => {
    // 获取最大显示数量
    maxNum.current = listContentRef.current?.clientHeight! / ITEM_HEIGHT;
    // 设置初始化开始结束下标
    setStart(0);
    setEnd(Math.min(maxNum.current, listInfo.current.length));
    // 循环列表元素，设置默认值
    listInfo.current = listData.current.map((_: any, index) => ({
      index,
      height: ITEM_HEIGHT,
      top: index * ITEM_HEIGHT,
      bottom: (index + 1) * ITEM_HEIGHT,
    }));
  }, []);

  // 实际展示数据
  const showData = useMemo(
    () => listData.current.slice(start, end),
    [start, end],
  );

  // 监听showData变化
  useLayoutEffect(() => {
    if (showData.length === 0 || listInfo.current.length === 0) {
      return;
    }
    // 更新列表元素高度
    updateListInfos();
    // 更新滚动距离
    updateScrollNum();
  }, [showData]);

  const updateListInfos = () => {
    // 当可视数据变更时候，listInfoRefs也会变，所以此时的listInfoRefs就是最新数据
    // 循环最新数据可以获取到真实高度，根据默认height，计算出差值，将差值添加到bottom上并更新最新height值
    // 并更新所有后续元素的top和bottom
    listInfoRefs.current.map((v: any) => {
      const current = listInfo.current[Number(v.dataset.index)];
      const diff = v.clientHeight - current.height;
      // 判断是否diff有值，为了避免已经滚动到底后，数据都是最新值后的无效重复渲染。
      // 只有diff有值，或者说第一次渲染计算才执行后续步骤。
      if (diff) {
        current.height = v.clientHeight;
        current.bottom += diff;
        // 需要将diff同步更新到后续所有top和bottom上，更新最新值
        for (let x = current.index + 1; x < listInfo.current.length; x++) {
          listInfo.current[x].top += diff;
          listInfo.current[x].bottom += diff;
        }
      }
    });
    // 最后占位元素高度，最后一项的bottom值
    setListItemHeights(listInfo.current[listInfo.current.length - 1].bottom);
  };

  // 更新滚动距离
  const updateScrollNum = () => {
    if (showData.length === 0) {
      return;
    }
    // 当滚动大于0时候,设置开始元素的top值为滚动距离
    // 否则设置为0
    setScrollNum(start > 0 ? listInfo.current[start].top : 0);
  };

  // 监听滚动事件
  const onScroll = () => {
    const scrollTop = listContentRef.current?.scrollTop!;
    const _start = updateStart(scrollTop);
    setStart(_start);
    setEnd(Math.min(_start + maxNum.current, listInfo.current.length));
  };

  // 更新开始下标
  // 二分查找，根据滚动距离，找到最近的开始下标
  const updateStart = (scroll: number) => {
    let start = 0,
      end = listInfo.current.length - 1;
    let middle = 0;
    // 如果开始下标小于结束下标，说明仍在循环区间
    while (start < end) {
      // 获取到中位下标
      middle = Math.floor((start + end) / 2);
      // 获取到中位元素
      const middleElement = listInfo.current[middle];
      // 如果滚动距离大于中位元素的bottom值，说明目前区间是middle~end。更新start为middle+1
      if (scroll > middleElement.bottom) {
        start = middle + 1;
        // 如果滚动距离小于中位元素的bottom值，说明目前区间是0~middle。更新end为middle
      } else if (scroll < middleElement.bottom) {
        end = middle;
        // 如果滚动距离恰好等于中位元素的bottom值，说明当前位置与下一个元素top值相同，直接返回middle，留一个元素距离当作滚动缓存区。参考updateScrollNum方法
      } else if (scroll === middleElement.bottom) {
        return middle;
      }
    }
    return middle;
  };

  return (
    <div>
      {/* 可视区域容器 */}
      <div className="list-container" onScroll={onScroll} ref={listContentRef}>
        {/* 撑开可视区的高度占位元素 */}
        <div className="phantom" style={{ height: `${listItemHeights}px` }} />
        {/* 列表内容容器 */}
        <div
          className="list-content"
          // 需要平移内容区域 到 可视窗口的位置
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
