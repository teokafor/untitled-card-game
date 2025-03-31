import React, { useState, useEffect, useRef } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';

import { drawHand } from '../../Functions/DrawHand.js';

// Components
import { Draggable } from '../Draggable/Draggable.jsx';
import { Card } from '../Card/Card.jsx';
import { Playerspace } from '../Playerspace/Playerspace.jsx';
import { Grid } from '../Grid/Grid.jsx';

// Styles
import './App.css';
import '../Card/Card.css';
import '../Playerspace/Playerspace.css';
import '../Grid/Grid.css';

const DRAG_OVERLAY_DURATION = 300; // Time in ms between drag end and animation end.

function App() {
  const [activeId, setActiveId] = useState(null);
  const [cardAParent, setCardAParent] = useState(null);
  const [cardBParent, setCardBParent] = useState(null);
  const [dragOverlayDuration, setDragOverlayDuration] = useState(DRAG_OVERLAY_DURATION);
  const [isDraggable, setIsDraggable] = useState(true);
  const [aType, setAType] = useState(null);
  const [bType, setBType] = useState(null);
  const [grid, setGrid] = useState({});


  // const [canFillA, setCanFillA] = useState(true);
  // const [canFillB, setCanFillB] = useState(true);

  const canFillA = useRef(true);
  const canFillB = useRef(true);

  if (cardAParent !== null && cardBParent !== null) if (isDraggable) {
    setDragOverlayDuration(0);
    setIsDraggable(false);
  }

  useEffect(() => {
    setAType(drawHand());
    setBType(drawHand());


    // REDUNDANT FROM GRID.JSX!! SHOULD ABSTRACT CONTAINER GENERATION ELSEWHERE(?)
    const containers = Array.apply(null, Array(25)).map(function (x, i) { return 'grid-droppable-' + i; });
    let newGrid = {};
    for (const key of containers) newGrid[key] = '';
    setGrid(newGrid);

  }, []);


  // Run when turn is over
  useEffect(() => {
    if (!isDraggable) {
      let newStoreA = '';
      let newStoreB = '';

      if (canFillA)  {
        newStoreA = <Card type={aType} color={'b'} isPlaced={true} />
        console.log('placing a');
        canFillA.current = true;
      } else {
        console.log('cant place a');
      }

      if (canFillB) {
        newStoreB = <Card type={bType} color={'r'} isPlaced={true} />
        console.log('placing b');
        canFillB.current = true;
      } else {
        console.log('cant place b');
      }

      setGrid( {...grid, [cardAParent]: newStoreA, [cardBParent]: newStoreB} );
      setAType(drawHand());
      setBType(drawHand());
      setCardAParent(null);
      setCardBParent(null);
      setIsDraggable(true);
      setDragOverlayDuration(DRAG_OVERLAY_DURATION);
    }

  }, [isDraggable]);

  const cardA = <Draggable id='active-card-a' disabled={!isDraggable}>{activeId === 'active-card-a' ? <Card isSelected={true} type={aType} color={'b'} /> : <Card isSelected={false} type={aType} color={'b'} />}</Draggable>
  const cardB = <Draggable id='active-card-b' disabled={!isDraggable}>{activeId === 'active-card-b' ? <Card isSelected={true} type={bType} color={'r'} /> : <Card isSelected={false} type={bType} color={'r'} />}</Draggable>

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className='containers'>        
        <Playerspace cardAParent={cardAParent} cardBParent={cardBParent} cardA={cardA} cardB={cardB} />
        <Grid cardAParent={cardAParent} cardBParent={cardBParent} cardA={cardA} cardB={cardB} grid={grid}  />
      </div>

      {/* Handle live movement of cards */}
      <DragOverlay dropAnimation={{duration: dragOverlayDuration}}>
        {activeId === 'active-card-a' ? <Card isDragging={true} type={aType} color={'b'} /> : <Card isDragging={true} type={bType} color={'r'} />}
      </DragOverlay>
    </DndContext>
  );

  function handleDragStart(event) {
    setActiveId(event.active.id);
  }

  function handleDragEnd(event) {
    setActiveId(null);

    const { over } = event;         // grid-droppable-n
    const cardId = event.active.id; // active-card-a / active-card-b

    let canDropA = true;
    let canDropB = true;
    let isCardinal = true;

    // TODO: Add alternating color check here

    if (over !== null) {
      // Only enforce cardinality rule if other card has been placed.
      if ((cardAParent !== null && cardId !== 'active-card-a') || (cardBParent !== null && cardId !== 'active-card-b')) isCardinal = checkCardinality(cardId, over.id);

      // Only allow assignment of dropped card to container if target container is empty.
      canDropA = (over.id !== cardBParent) ? true : false;
      canDropB = (over.id !== cardAParent) ? true : false;
    }

    let isALegal = canDropA && over && isCardinal;
    let isBLegal = canDropB && over && isCardinal;

    if (cardId === 'active-card-a') isALegal = calculateScore(cardId, over.id);
    else isBLegal = calculateScore(cardId, over.id);
    // isALegal = calculateScore(); // This way we can reject wrong-color placement. Maybe refactor cardinality to follow this too?




    // let oldCard = grid[over.id];
    // let curCard = cardA.props.children;

    // if (oldCard !== '') {
    //   console.log(curCard);
    //   calculateScore(oldCard, curCard);
    // }



    console.log(`Status of legality pre round end:\nisALegal: ${isALegal}\nisBLegal: ${isBLegal}`);
    
    // *Ends* the turn.      
    if (cardId === 'active-card-a') setCardAParent(isALegal ? over.id : null);
    else setCardBParent(isBLegal ? over.id : null);
  }

  function checkCardinality(cardId, currentContainer) {
    let otherContainer = cardId === 'active-card-a' ? cardBParent : cardAParent; // Get container of already placed card.
    let containerId = Number(otherContainer.split('-').reverse()[0]); // Grab id of already placed card.
    let validContainers = [containerId - 5, containerId - 1, containerId + 1, containerId + 5]; // Create array of legal positions based on already placed card.
    if (validContainers[2] % 5 === 0) validContainers.splice(2, 1); // Prevent placement of consecutive edge cards.
    if ((validContainers[1] + 1) % 5 === 0) validContainers.splice(1, 1);
    validContainers = validContainers.filter((n) => n >= 0 && n <= 24).map((item) => 'grid-droppable-' + item); // Remove OOB positions and format id.
    return validContainers.includes(currentContainer) ? true : false; // Return true if desired move is cardinal to other card.
  }

  function calculateScore(curCardId, placedCardId) {
    let curCard = curCardId !== 'active-card-a' ? cardA : cardB;
    let placedCard = grid[placedCardId];

    // Check for color. Returns false if not met. any code after this point can be a bit looser, as it will make the assumption that cards are diff.
    if (placedCard !== '' && curCard.props.children.props.color !== placedCard.props.color) return false;
    else return true;

    // // Check if 2nd placement (make prerequisite before calling calculateScore?)
    // if (cardAParent !== null || cardBParent !== null) {
    //   if (placedCard !== '' && curCardId === 'active-card-a') console.log('changing a');
    //   if (placedCard !== '' && curCardId === 'active-card-b') console.log('changing b');
    // }
  }
}

export { App };