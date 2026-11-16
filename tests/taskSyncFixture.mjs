export function taskSyncFixture() {
  const snapshot = new Map();
  return { isCurrent: () => true, token: () => 0, guard() {},
    read: (load) => load(), observe: (task) => task, observeMany: (items) => items,
    current: (task) => task, confirm: (task) => task, confirmMany: (items) => items,
    getVersion: () => 0, getSnapshot: () => snapshot, subscribe: () => () => {},
  };
}
