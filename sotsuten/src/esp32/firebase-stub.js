/* ESP32 版（インターネットなし）: Firebase の代わり。スマホの投稿は使えない（送れない・届かない） */
export const initializeApp = () => ({});
export const getFirestore = () => ({});
export const collection = () => null;
export const query = () => null;
export const where = () => null;
export const orderBy = () => null;
export const serverTimestamp = () => null;
export const Timestamp = { fromMillis: (ms) => ({ toMillis: () => ms }), now: () => ({ toMillis: () => Date.now() }) };
export const addDoc = () => Promise.reject(Object.assign(new Error('offline'), { code: 'offline' }));
export const onSnapshot = () => () => {};
