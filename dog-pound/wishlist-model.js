(function(root) {
  'use strict';
  function add(ids, id) {
    if (ids.includes(id)) return ids.slice();
    if (ids.length >= 3) throw Error('Your three places are full. Release a dog to make room.');
    return [...ids, id];
  }
  function move(ids, from, to) {
    const result = ids.slice();
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || from >= ids.length || to < 0 || to > 2) return result;
    const [id] = result.splice(from, 1); result.splice(Math.min(to, result.length), 0, id);
    return result;
  }
  const api = {add, move, remove: (ids, id) => ids.filter(value => value !== id)};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AllDogsWishlist = api;
})(typeof window !== 'undefined' ? window : globalThis);
