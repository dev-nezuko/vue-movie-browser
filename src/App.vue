<script setup lang="ts">
import {
  QHeader,
  QLayout,
  QPage,
  QPageContainer,
  QToolbar,
  QToolbarTitle,
} from 'quasar'
</script>

<template>
  <QLayout view="hHh lpR fFf">
    <QHeader elevated class="bg-primary text-white">
      <QToolbar>
        <QToolbarTitle>Movie search</QToolbarTitle>
      </QToolbar>
    </QHeader>

    <QPageContainer>
      <QPage padding>
        <router-view />
      </QPage>
    </QPageContainer>
  </QLayout>
</template>

<style scoped lang="scss"></style>
