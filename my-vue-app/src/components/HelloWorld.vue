<script setup lang="ts">
import { ref } from 'vue'
import heroImg from '../assets/hero.png'
import viteLogo from '../assets/vite.svg'
import vueLogo from '../assets/vue.svg'
import { onMounted, reactive, computed, toRef, toRefs, unref, toValue, isReactive, isRef, watchEffect, readonly, shallowReadonly, shallowRef, triggerRef, customRef, watch, useId } from 'vue'
import Test from './Test.vue'

const a = ref(123)
const b = reactive({a: 234})
const d = reactive([1, 2, 3])

function click() {
    a.value = Math.random();
    b.c = 888
    d[0] = 999
}

watch(b, (newVal, oldVal) => {
    console.log('b', newVal, oldVal)
})
watch(d, (newVal, oldVal) => {
    console.log('d', newVal, oldVal)
})
</script>

<template>
  <section id="center">
    <div class="hero">
      <img :src="heroImg" class="base" width="170" height="179" alt="" />
      <img :src="vueLogo" class="framework" alt="Vue logo" />
      <img :src="viteLogo" class="vite" alt="Vite logo" />
    </div>
    <button @click="click">点击</button>
    <div v-memo="[b.a]">{{ b.a }}</div>
    <div v-memo="[b.c]">{{ b.c }}</div>
    <Test ref="testRef"  :name="a" placeholder="请输入" />
  </section>
</template>
