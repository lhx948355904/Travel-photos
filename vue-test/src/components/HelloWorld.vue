<script setup lang="ts">
import { ref, watch, watchEffect, reactive, computed, onWatcherCleanup, watchSyncEffect, watchPostEffect, toRef, unref, isRef, isReactive, isProxy, shallowRef, toRaw } from 'vue'
import { Button } from 'ant-design-vue'

const obj = {c: 3}
const ref1 = ref(obj)
console.log(obj === toRaw(ref1.value))

const original = { count: 0 }
const state = reactive(original)

const raw = toRaw(state)
watchEffect(() => {
  console.log(state.count)
})
// 首次输出 10

raw.count = 20
// 数据变了，但上面的 effect 不会因此重新执行

state.count = 30
// 通过代理修改，effect 会重新执行

function clickMe() {
}


</script>

<template>
  <div>
    <h1>Hello World</h1>
  </div>
  <Button type="primary" @click="clickMe">Click me</Button>
</template>
