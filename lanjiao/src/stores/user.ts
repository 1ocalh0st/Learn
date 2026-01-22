import { defineStore } from 'pinia'

const KEY = "auth";

type Auth = {token: string; name: string};

export const useUserStore = defineStore('user', {
  state: () => ({
    token: '',
    name: '',
  }),
  actions:{
    initFromStorage() {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      try {
        const data = JSON.parse(raw) as Auth;
        this.token = data.token || "";
        this.name = data.name || "";
      } catch {
        localStorage.removeItem(KEY);
      }
    },
    setAuth(token: string, name: string) {
      this.token = token
      this.name = name
      localStorage.setItem(KEY, JSON.stringify({ token, name }));
    },
    logout(){
      this.token = ''
      this.name = ''
      localStorage.removeItem(KEY);
    },
  },
});
