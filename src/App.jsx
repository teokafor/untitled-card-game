import React, { useState } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { Draggable } from './Components/Draggable';
import { GridCell } from './Components/GridCell';
import { Card } from './Components/Card';
import { DummyCard } from './Components/DummyCard';

// Build an empty 5x5 array to represent grid cells
const containers = Array.apply(null, Array(25)).map(function (x, i) { return 'grid-droppable-' + i; });

function App() {
  const [activeId, setActiveId] = useState(null);

  const [cardAParent, setCardAParent] = useState(null);
  const [cardBParent, setCardBParent] = useState(null);

  // Check if both cards belong to a parent (i.e., a droppable.)
  const isDraggable = (cardAParent === null || cardBParent === null) ? true : false;

  const cardA = <Draggable id='active-card-a' disabled={!isDraggable}>{activeId === 'active-card-a' ? <Card isSelected={true} /> : <Card isSelected={false} />}</Draggable>
  const cardB = <Draggable id='active-card-b' disabled={!isDraggable}>{activeId === 'active-card-b' ? <Card isSelected={true} /> : <Card isSelected={false} />}</Draggable>

  // Hold the space of the currently placed card 
  const dummyCard = <DummyCard />

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className='containers'>
        <div className='playerspace-container'>
          <div className='playerspace'>
            <div className='scorebug'>
              <div className='current-score'>SCORE: 000</div>
              <div className='high-score'>HIGH: 000</div>
            </div>
            <div className='draw-pile-container'>
              <div className='card-base-state'>
                <div className='card-back'></div>
              </div>

              <div className='card-base-state'>
                <div className='card-back'></div>
              </div>
            </div>
            <div className='player-hand'>
              {/* Move the card back into playerspace if not related to a grid cell. */}
              {cardAParent === null ? cardA : dummyCard}
              {cardBParent === null ? cardB : dummyCard}
            </div>
          </div>
        </div>

        <div className='grid-container'>
          <div className='grid-bg'></div>
          {
            // Populate grid
            containers.map((id) => (
              <GridCell id={id} key={id}>
                {/* Make card child of grid cell from drag end. */}
                {cardAParent === id ? cardA : null}
                {cardBParent === id ? cardB : null}
              </GridCell>))

          }</div>
      </div>

      {/* Handle live movement of cards */}
      <DragOverlay>
        {activeId === 'active-card-a' ? <Card isDragging={true} /> : <Card isDragging={true} />}
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

    // Only enforce cardinality rule if other card has been placed.
    if (cardAParent !== null || cardBParent !== null) isCardinal = checkCardinality(cardId, over.id);

    // Only allow assignment of dropped card to container if target container is empty.
    if (over !== null) {
      canDropA = (over.id !== cardBParent) ? true : false;
      canDropB = (over.id !== cardAParent) ? true : false;
    }
    
    if (cardId === 'active-card-a') setCardAParent(over && canDropA && isCardinal ? over.id : null);
    else setCardBParent(over && canDropB && isCardinal ? over.id : null);
  }


  function checkCardinality(cardId, currentContainer) {
    let otherContainer = cardId === 'active-card-a' ? cardBParent : cardAParent; // Get container of already placed card.
    let containerId = Number(otherContainer.split('-').reverse()[0]); // Grab id of already placed card.
    let validContainers = [containerId - 5, containerId - 1, containerId + 1, containerId + 5]; // Create array of legal positions based on already placed card.
    validContainers = validContainers.filter((n) => n >= 0 && n <= 24).map((item) => 'grid-droppable-' + item); // Remove OOB positions and format id.
    return validContainers.includes(currentContainer) ? true : false; // Return true if desired move is cardinal to other card.
  }
}

export { App };