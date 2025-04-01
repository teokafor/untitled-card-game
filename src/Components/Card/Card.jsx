export function Card({isDragging, isSelected, isPlaced, type, color}) {

    // Not sure why null objects are passed first (StrictMode?) 
    // Either way, a more solid workaround should be implemented.
    if (type === null) type = {shape: './circle_r', mult: ''}; 

    // Mutate class list based on current card state
    let classes = "card-base-state";
    if (isDragging) classes += " card-dragging-state";
    if (isSelected) classes += " card-selected-state";
    if (isPlaced)   classes += " card-placed-state";


    const path = color === 'b' ? `./${type.shape}_b.svg` : `./${type.shape}_r.svg`;
    const style = {backgroundImage: `url(${path})`};

    return (
        <div className={classes}>
            <div className="card-mult-top">{type.mult}x</div>
            <div className="card-inner-shape" style={style}></div>
            <div className="card-mult-bot">{type.mult}x</div>
        </div>
    );
}

export function DummyCard() {
    return (
    <div className="dummy-card"></div>
    );
}