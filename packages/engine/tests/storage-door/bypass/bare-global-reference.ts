// Bait: the global handed to something else without ever being called here.
// Nothing follows the name -- no dot, no bracket, no parenthesis -- so the
// text pattern, which required one of those, stayed green.
export function borrow(): Storage {
  const store = localStorage;
  return store;
}
