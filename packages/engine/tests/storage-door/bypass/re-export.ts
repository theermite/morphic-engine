// Bait: a re-export. The module never calls anything, and hands the library's
// door to every one of its own importers.
export { deleteDB } from 'idb';
