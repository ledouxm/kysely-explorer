import { AsyncStorage } from "@tanstack/react-query-persist-client";
import { createStore, del, get, set } from "idb-keyval";

const queryStore = createStore("kysely-explorer", "query-cache");

export const asyncQueryStorage: AsyncStorage = {
  getItem: async (key) => {
    console.log("get", key);
    return get(key, queryStore);
  },
  setItem: async (key, value) => {
    console.log("set", key, value);
    return set(key, value, queryStore);
  },
  removeItem: async (key) => {
    console.log("del", key);
    return del(key, queryStore);
  },
};
