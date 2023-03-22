import { useCallback, useEffect, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";

type Cell = boolean;
type Grid = Cell[][];
const CELL_SIZE = 10;
const WIDTH = 1920;
const HEIGHT = 1080;
const RANDOM = 0.8;

export default function GameOfLife({
    showName,
    setShowName,
}: {
    showName?: boolean;
    setShowName?: (showName: boolean) => void;
}) {
    const [componentRef, inView] = useInView({ threshold: 0.1 });
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [cells, setCells] = useState<Grid>(
        Array.from({ length: HEIGHT / CELL_SIZE }, () => {
            return Array.from(
                { length: WIDTH / CELL_SIZE },
                () => {
                    return Math.random() > RANDOM;
                },
                []
            );
        })
    );
    const [mouseOverCell, setMouseOverCell] = useState<[number, number] | null>(
        null
    );
    const [systemRunning, setSystemRunning] = useState(true);
    const [userRunning, setUserRunning] = useState(true);
    const [running, setRunning] = useState(true);
    const [showControls, setShowControls] = useState(false);

    const updateGrid = useCallback(() => {
        const newGrid = cells.map((row, rowIndex) => {
            return row.map((cell, cellIndex) => {
                const neighbors = countNeighbors(cells, rowIndex, cellIndex);
                return cell
                    ? neighbors === 2 || neighbors === 3
                    : neighbors === 3;
            });
        });

        setCells(newGrid);
    }, [cells]);

    function countNeighbors(grid: Grid, row: number, col: number): number {
        const [numRows, numCols] = [grid.length, grid[0]?.length || 0];
        let count = 0;

        // Check each of the 8 neighbors
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                // Skip the current cell
                if (i === 0 && j === 0) continue;

                // Compute the neighbor's row and column
                const neighborsRow = (row + i + numRows) % numRows;
                const neighborsColumn = (col + j + numCols) % numCols;

                // Check if the neighbor is within the grid
                if (
                    neighborsRow >= 0 &&
                    neighborsRow < numRows &&
                    neighborsColumn >= 0 &&
                    neighborsColumn < numCols
                ) {
                    // Increment the count if the neighbor is alive
                    if (grid[neighborsRow]?.[neighborsColumn]) {
                        count++;
                    }
                }
            }
        }

        return count;
    }

    const handleRunClick = () => {
        setUserRunning(!userRunning);
    };

    const step = useCallback(() => {
        if (running) return;
        updateGrid();
    }, [running, updateGrid]);

    const random = () => {
        setCells(
            Array.from({ length: HEIGHT / CELL_SIZE }, () => {
                return Array.from(
                    { length: WIDTH / CELL_SIZE },
                    () => {
                        return Math.random() > RANDOM;
                    },
                    []
                );
            })
        );
    };

    const clear = () => {
        setCells(
            Array.from({ length: HEIGHT / CELL_SIZE }, () => {
                return Array.from(
                    { length: WIDTH / CELL_SIZE },
                    () => {
                        return false;
                    },
                    []
                );
            })
        );
    };

    const fullScreen = () => {
        if (document.fullscreenEnabled) {
            // Check if browser is already in fullscreen mode
            if (document.fullscreenElement) {
                document.exitFullscreen().catch((err) => {
                    console.error(err);
                });
                return;
            }

            const elem = document.documentElement; // Get the root element of the document
            elem.requestFullscreen().catch((err) => {
                console.error(err);
            });
        } else {
            console.error("Fullscreen mode is not supported by this browser");
        }
    };

    const addGlider = useCallback(() => {
        const glider = [
            [true, true, true],
            [true, false, false],
            [false, true, false],
        ];

        const inputRow = mouseOverCell ? mouseOverCell[0] : 50;
        const inputColumn = mouseOverCell ? mouseOverCell[1] : 50;

        const newGrid = cells.map((row, rowIndex) => {
            return row.map((cell, cellIndex) => {
                if (
                    rowIndex >= inputRow &&
                    rowIndex < inputRow + glider.length &&
                    cellIndex >= inputColumn &&
                    cellIndex < inputColumn + (glider[0] ? glider[0].length : 0)
                ) {
                    return glider[rowIndex - inputRow]?.[
                        cellIndex - inputColumn
                    ];
                } else {
                    return cell;
                }
            });
        });

        setCells(newGrid as Grid);
    }, [cells, mouseOverCell]);

    // Draw the grid
    useEffect(() => {
        function drawGrid() {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const context = canvas.getContext("2d");
            if (!context) return;

            context.clearRect(0, 0, canvas.width, canvas.height);

            cells.forEach((row, rowIndex) => {
                row.forEach((cell, cellIndex) => {
                    const windowsWidth = window.innerWidth;
                    const windowsHeight = window.innerHeight;

                    // Check if cell is within the viewport
                    if (
                        cellIndex * CELL_SIZE > windowsWidth ||
                        rowIndex * CELL_SIZE > windowsHeight
                    ) {
                        return;
                    }

                    if (!cell) return;

                    context.beginPath();
                    context.rect(
                        cellIndex * CELL_SIZE,
                        rowIndex * CELL_SIZE,
                        CELL_SIZE,
                        CELL_SIZE
                    );

                    context.fillStyle = "RGBA(245, 245, 245, 1)";
                    context.fill();
                    context.stroke();
                });
            });

            if (mouseOverCell) {
                context.beginPath();
                context.rect(
                    mouseOverCell[1] * CELL_SIZE,
                    mouseOverCell[0] * CELL_SIZE,
                    CELL_SIZE,
                    CELL_SIZE
                );

                context.fillStyle = "rgba(255, 255, 255, 0.2)";
                context.fill();
                context.stroke();
            }
        }

        drawGrid();
    }, [cells, mouseOverCell]);

    // Listen for mouse events
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }

        const context = canvas.getContext("2d");

        if (!context) {
            return;
        }

        const toggleCell = (event: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            const rowIndex = Math.floor(y / CELL_SIZE);
            const cellIndex = Math.floor(x / CELL_SIZE);

            const newCells = cells.map((row, rIndex) => {
                if (rIndex === rowIndex) {
                    return row.map((cell, cIndex) => {
                        if (cIndex === cellIndex) {
                            return !cell;
                        }

                        return cell;
                    });
                }

                return row;
            });

            setCells(newCells);
        };

        const handleMouseOver = (event: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            const rowIndex = Math.floor(y / CELL_SIZE);
            const cellIndex = Math.floor(x / CELL_SIZE);

            setMouseOverCell([rowIndex, cellIndex]);
        };

        const handleMouseOut = () => {
            setMouseOverCell(null);
        };

        canvas.addEventListener("click", toggleCell);
        canvas.addEventListener("mousemove", handleMouseOver);
        canvas.addEventListener("mouseout", handleMouseOut);

        return () => {
            canvas.removeEventListener("click", toggleCell);
            canvas.removeEventListener("mousemove", handleMouseOver);
            canvas.removeEventListener("mouseout", handleMouseOut);
        };
    }, [cells]);

    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            switch (event.key) {
                case " ":
                    event.preventDefault();
                    setUserRunning(!userRunning);
                    break;
                case "r":
                    event.preventDefault();
                    random();
                    break;
                case "c":
                    event.preventDefault();
                    clear();
                    break;
                case "s":
                    event.preventDefault();
                    step();
                    break;
                case "p":
                    event.preventDefault();
                    setRunning(!running);
                    break;
                case "m":
                    event.preventDefault();
                    setShowControls(!showControls);
                    break;
                case "n":
                    if (!setShowName) break;
                    event.preventDefault();
                    setShowName(!showName);
                    break;
                case "f":
                    event.preventDefault();
                    fullScreen();
                    break;
                case "g":
                    event.preventDefault();
                    addGlider();
                    break;
            }
        },
        [
            userRunning,
            step,
            running,
            showControls,
            setShowName,
            showName,
            addGlider,
        ]
    );

    // Listen to keyboard events
    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [handleKeyDown]);

    // Run the simulation
    useEffect(() => {
        let timer: number | undefined;

        if (running) {
            timer = setInterval(() => {
                updateGrid();
            }, 100);
        } else {
            clearInterval(timer);
        }

        return () => clearInterval(timer);
    }, [running, updateGrid]);

    useEffect(() => {
        if (!inView) {
            setSystemRunning(false);
        } else {
            setSystemRunning(true);
        }
    }, [inView]);

    useEffect(() => {
        if (systemRunning && userRunning) {
            setRunning(true);
        } else {
            setRunning(false);
        }
    }, [systemRunning, userRunning]);

    return (
        <div ref={componentRef} className="relative h-screen w-screen bg-black">
            <canvas ref={canvasRef} width={WIDTH} height={HEIGHT}></canvas>
            <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4">
                <a href="https://cyrusvatandoost.com/" target="_blank">
                    <CanvasButton
                        text="Built by Cyrus Vatandoost"
                        onClick={function (): void {
                            throw new Error("Function not implemented.");
                        }}
                    />
                </a>
            </div>
            <div className="absolute top-2 left-2 sm:top-4 sm:left-4">
                <div className="flex flex-row flex-wrap gap-2">
                    <CanvasButton
                        onClick={() => setShowControls(!showControls)}
                        text={showControls ? "Hide Menu" : "Menu"}
                        shortcut="m"
                    />
                    {showControls && (
                        <>
                            <CanvasButton
                                onClick={handleRunClick}
                                text={running ? "Pause" : "Start"}
                                shortcut="space"
                            />
                            <CanvasButton
                                onClick={step}
                                text="Step"
                                shortcut="s"
                            />
                            <CanvasButton
                                onClick={random}
                                text="Random"
                                shortcut="r"
                            />
                            <CanvasButton
                                onClick={clear}
                                text="Clear"
                                shortcut="c"
                            />
                            {setShowName && (
                                <CanvasButton
                                    onClick={() => setShowName(!showName)}
                                    text={showName ? "Hide Name" : "Show Name"}
                                    shortcut="n"
                                />
                            )}
                            <CanvasButton
                                onClick={fullScreen}
                                text="Full Screen"
                                shortcut="f"
                            />
                            <CanvasButton
                                onClick={addGlider}
                                text="Add Glider"
                                shortcut="g"
                            />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function CanvasButton({
    text,
    onClick,
    shortcut,
}: {
    text: string;
    onClick: () => void;
    shortcut?: string;
}) {
    return (
        <button
            className="bg-neutral-800 px-2 py-1 text-sm text-white transition hover:scale-105 hover:bg-neutral-600 active:scale-95 active:bg-neutral-500"
            onClick={onClick}
        >
            <div className="flex items-center gap-2">
                {text}
                {shortcut && (
                    <span className="border border-neutral-700 px-1 font-mono text-xs">
                        {shortcut}
                    </span>
                )}
            </div>
        </button>
    );
}
