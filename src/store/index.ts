import { create } from 'zustand';
import { createSessionSlice, type SessionSlice } from './slices/session';

// Composition pattern — later feature parts extend the store like so:
//   1. Add `& <Name>Slice` to FlexStore below.
//   2. Spread `...create<Name>Slice(...a)` into the initializer.
// Slice creators must be typed `StateCreator<TSlice, [], [], TSlice>`.
export type FlexStore = SessionSlice;

export const useFlexStore = create<FlexStore>()((...a) => ({
  ...createSessionSlice(...a),
}));
