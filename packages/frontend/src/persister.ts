import { AsyncStorage } from "@tanstack/react-query-persist-client";
import { createStore, del, get, set } from "idb-keyval";

const queryStore = createStore("kysely-explorer", "query-cache");

export const asyncQueryStorage: AsyncStorage = {
  getItem: async (key) => {
    return get(key, queryStore);
  },
  setItem: async (key, value) => {
    return set(key, value, queryStore);
  },
  removeItem: async (key) => {
    return del(key, queryStore);
  },
};
