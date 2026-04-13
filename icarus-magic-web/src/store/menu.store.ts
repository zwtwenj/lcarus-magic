import { defineStore } from 'pinia';

export const useMenuStore = defineStore('menu', {
  state: () => ({
    menuItems: [
      {
        id: 'projects',
        name: '项目',
        icon: '📁',
        path: '/projects'
      },
      {
        id: 'tasks',
        name: '任务',
        icon: '📋',
        path: '/tasks'
      }
    ],
    activeMenu: 'projects'
  }),
  actions: {
    setActiveMenu(menuId: string) {
      this.activeMenu = menuId;
    }
  }
});