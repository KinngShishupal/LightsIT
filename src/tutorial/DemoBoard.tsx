import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { Board } from '../components/Board';
import { parseLevel, trace } from '../game/engine';
import { type Concept, framePieces } from './concepts';

const noop = () => {};
const never = () => false;

/** A tiny, non-interactive board that loops through a concept's demo frames. */
export function DemoBoard({
  concept,
  width,
}: {
  concept: Concept;
  width: number;
}) {
  const { demo } = concept;
  const level = useMemo(
    () =>
      parseLevel(
        {
          name: concept.id,
          hint: '',
          map: demo.map,
          emitters: demo.emitters,
          inventory: { mirror: 0, splitter: 0 },
        },
        0,
      ),
    [concept.id, demo],
  );
  const [frame, setFrame] = useState(0);
  const win = useSharedValue(0);
  const energy = useSharedValue(0);

  useEffect(() => {
    setFrame(0);
    if (demo.frames.length < 2) return;
    const id = setInterval(
      () => setFrame(f => (f + 1) % demo.frames.length),
      demo.ms ?? 1500,
    );
    return () => clearInterval(id);
  }, [demo]);

  const pieces = useMemo(() => framePieces(demo.frames[frame]), [demo, frame]);
  const result = useMemo(() => trace(level, pieces), [level, pieces]);
  // Board adds ~0.7 cell of padding around the grid for glow.
  const cell = Math.floor(width / (level.cols + 0.7));

  return (
    <View pointerEvents="none">
      <Board
        level={level}
        pieces={pieces}
        result={result}
        cell={cell}
        hint={null}
        dragFrom={null}
        invalidCell={null}
        win={win}
        energy={energy}
        canDrag={never}
        onTap={noop}
        onLongPress={noop}
        onDragStart={noop}
        onDragMove={noop}
        onDragEnd={noop}
        onDragCancel={noop}
      />
    </View>
  );
}
