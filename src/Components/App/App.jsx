import React, { useState, useEffect, useRef } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';

import { drawHand } from '../../Functions/DrawHand.js';
import { generateBlackouts } from '../../Functions/Blackout.js';

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
const CHAIN_LIMIT = 5;

function App() {
  // General management
  const [activeId, setActiveId] = useState(null);
  const [dragOverlayDuration, setDragOverlayDuration] = useState(DRAG_OVERLAY_DURATION);
  const [isDraggable, setIsDraggable] = useState(true);
  // Cards
  const [cardAParent, setCardAParent] = useState(null);
  const [cardBParent, setCardBParent] = useState(null);
  const [aType, setAType] = useState(null);
  const [bType, setBType] = useState(null);
  // Grid
  const [grid, setGrid] = useState({});
  const [blackouts, setBlackouts] = useState([]);
  // Scoring
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [roundScore, setRoundScore] = useState(0);
  const [roundMultiplier, setRoundMultiplier] = useState(1);

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

    setBlackouts(generateBlackouts(containers));
  }, []);


  // Run when turn is over
  useEffect(() => {
    if (!isDraggable) {
      // Only store card to grid if grid cell is already empty. 
      const newStoreA = (grid[cardAParent] === '') ? <Card type={aType} color={'b'} isPlaced={true} /> : '';
      const newStoreB = (grid[cardBParent] === '') ? <Card type={bType} color={'r'} isPlaced={true} /> : '';

      // Check if the multiplier can increase
      if (scoreA !== 0 || scoreB !== 0) {
        if (roundMultiplier < CHAIN_LIMIT) setRoundMultiplier(cur => cur + 1);
      } else {
        setRoundMultiplier(1);
      }

      setRoundScore(cur => cur + (scoreA + scoreB) * roundMultiplier);
      setGrid({ ...grid, [cardAParent]: newStoreA, [cardBParent]: newStoreB });
      setAType(drawHand());
      setBType(drawHand());
      setCardAParent(null);
      setCardBParent(null);
      setIsDraggable(true);
      setScoreA(0);
      setScoreB(0);
      setDragOverlayDuration(DRAG_OVERLAY_DURATION);
    }

  }, [isDraggable]);

  const cardA = <Draggable id='active-card-a' disabled={!isDraggable}>{activeId === 'active-card-a' ? <Card isSelected={true} type={aType} color={'b'} /> : <Card isSelected={false} type={aType} color={'b'} />}</Draggable>
  const cardB = <Draggable id='active-card-b' disabled={!isDraggable}>{activeId === 'active-card-b' ? <Card isSelected={true} type={bType} color={'r'} /> : <Card isSelected={false} type={bType} color={'r'} />}</Draggable>

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className='containers'>
        <Playerspace cardAParent={cardAParent} cardBParent={cardBParent} cardA={cardA} cardB={cardB} curScore={roundScore} mult={roundMultiplier}/>
        <Grid cardAParent={cardAParent} cardBParent={cardBParent} cardA={cardA} cardB={cardB} grid={grid} containers={blackouts} />
      </div>

      {/* Handle live movement of cards */}
      <DragOverlay dropAnimation={{ duration: dragOverlayDuration }}>
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

    let isALegal = true;
    let isBLegal = true;

    // skip checks if card was not placed on cell
    if (over === null) {
      isALegal = false;
      isBLegal = false;
    }

    // Only enforce cardinality rule if other card has been placed.
    if ((cardAParent !== null && cardId !== 'active-card-a') || (cardBParent !== null && cardId !== 'active-card-b')) {
      if (cardId === 'active-card-a' && isALegal) isALegal = checkCardinality(cardId, over.id);
      else if (cardId === 'active-card-b' && isBLegal) isBLegal = checkCardinality(cardId, over.id);
    }

    // Run shape check
    if (isALegal && cardId === 'active-card-a') isALegal = checkShapes(cardId, over.id);
    else if (isBLegal && cardId === 'active-card-b') isBLegal = checkShapes(cardId, over.id);

    // Run color check & score
    if (isALegal && cardId === 'active-card-a') isALegal = calculateScore(cardId, over.id);
    else if (isBLegal && cardId === 'active-card-b') isBLegal = calculateScore(cardId, over.id);

    // Starts end-of-round code.      
    if (cardId === 'active-card-a') setCardAParent(isALegal ? over.id : null);
    else setCardBParent(isBLegal ? over.id : null);
  


    // Todo: refactor rule checks into own file at some point.
    function checkCardinality(cardId, currentContainer) {
      let otherContainer = cardId === 'active-card-a' ? cardBParent : cardAParent; // Get container of already placed card.
      let containerId = Number(otherContainer.split('-').reverse()[0]); // Grab id of already placed card.
      let validContainers = [containerId - 5, containerId - 1, containerId + 1, containerId + 5]; // Create array of legal positions based on already placed card.
      if (validContainers[2] % 5 === 0) validContainers.splice(2, 1); // Prevent placement of consecutive edge cards.
      if ((validContainers[1] + 1) % 5 === 0) validContainers.splice(1, 1);
      validContainers = validContainers.filter((n) => n >= 0 && n <= 24).map((item) => 'grid-droppable-' + item); // Remove OOB positions and format id.
      return validContainers.includes(currentContainer) ? true : false; // Return true if desired move is cardinal to other card.
    }

    function checkShapes(curCardId, placedCardId) {
      const curCard = curCardId === 'active-card-a' ? cardA : cardB;
      const placedCard = grid[placedCardId];

      const validMatches = {
        'diamond':  ['diamond', 'triangle'],
        'triangle': ['diamond', 'triangle', 'circle'],
        'circle':   ['triangle', 'circle', 'pentagon'],
        'pentagon': ['circle', 'pentagon', 'hexagon'],
        'hexagon':  ['pentagon', 'hexagon']
      };
      
      if (placedCard !== '') {
          if (validMatches[curCard.props.children.props.type.shape].includes(placedCard.props.type.shape)) return true;
          else return false;
      } 
      return true;
    }

    // Todo: split into color check and run calculation at end only if legal.
    function calculateScore(curCardId, placedCardId) {
      const curCard = curCardId === 'active-card-a' ? cardA : cardB;
      const placedCard = grid[placedCardId];

      // Clear score if previously legal score, then was moved.
      if (curCardId === 'active-card-a' && placedCard === '') setScoreA(0);
      if (curCardId === 'active-card-b' && placedCard === '') setScoreB(0);

      // Check for color. Returns false if not met.
      if (placedCard !== '' && curCard.props.children.props.color === placedCard.props.color) {
        return false;
      } else if (placedCard !== '') {
        if (curCardId === 'active-card-a') setScoreA(curCard.props.children.props.type.mult * placedCard.props.type.mult);
        else setScoreB(curCard.props.children.props.type.mult * placedCard.props.type.mult);
      }
      return true;
    }
  }
}

export { App };