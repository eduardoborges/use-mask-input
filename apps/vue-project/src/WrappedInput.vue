<script setup lang="ts">
// A component whose root is a <div>, not the <input>. The directive lands on
// the <div>; the library has to dig the real input out of it.
</script>

<template>
  <div class="wrapper">
    <span>wrapper &rarr;</span>
    <input placeholder="inside a wrapper" />
  </div>
</template>

<style scoped>
.wrapper {
  display: inline-flex;
  gap: 0.5rem;
  align-items: center;
  border: 1px dashed #999;
  padding: 0.25rem;
}
</style>
