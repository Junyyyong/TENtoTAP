import { expect, it } from 'vitest';
import { BlockColors } from './blockColors';
import type { Board } from '../core/types';
const board: Board = {width:2,cells:[1,1,1,1].map(value=>({value,cleared:false}))};
it('assigns colors independently of digits and preserves them through redraws',()=>{
  let n=0;
  const palette=new BlockColors(()=>((n++)%9)/9);
  palette.reset(board);
  expect(board.cells.map((_,i)=>palette.at(i))).toEqual([1,2,3,4]);
  const cloned={...board,cells:board.cells.map(c=>({...c}))};
  palette.sync(board,cloned);
  expect(cloned.cells.map((_,i)=>palette.at(i))).toEqual([1,2,3,4]);
  expect(n).toBe(4);
  palette.reset(board);
  expect(palette.at(0)).toBe(5);
});
it('assigns a fresh color to a refilled slot and retains other blocks',()=>{
  let n=0;
  const palette=new BlockColors(()=>((n++)%9)/9);
  palette.reset(board);
  const cleared={...board,cells:board.cells.map((c,i)=>({...c,cleared:i===0}))};
  palette.sync(board,cleared);
  palette.sync(cleared,board);
  expect([palette.at(0),palette.at(1)]).toEqual([5,2]);
});
