import { defineStore } from 'pinia';

export const useUserStore = defineStore('user', {
  state: () => ({
    userId: ''
  }),
  actions: {
    setUserId(userId: string) {
      this.userId = userId;
    },
    clearUserId() {
      this.userId = '';
    }
  }
});
