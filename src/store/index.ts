import { createPinia } from 'pinia';
import piniaPluginPersistence from 'pinia-plugin-persistedstate';

const store = createPinia();
store.use(piniaPluginPersistence);

export default store;

export * from './appStore';
export * from './userStore';
export * from './connectionStore';
export * from './fileStore.ts';
export * from './chatStore';
export * from './clusterManageStore';
export * from './backupRestoreStore';
export * from './tabStore.ts';
