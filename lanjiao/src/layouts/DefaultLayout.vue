<template>
  <div style="display:flex; min-height:100vh;">
    <aside style="width:220px; border-right:1px solid #eee; padding:12px;">
      <h3>菜单</h3>
      <RouterLink to="/">首页</RouterLink>
      <br />
      <RouterLink to="/users">用户列表</RouterLink>
    </aside>

    <main style="flex:1; padding:16px;">
      <RouterView />
    </main>
  </div>
</template>
