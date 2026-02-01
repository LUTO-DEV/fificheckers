const CheckersLogic = require('../utils/checkers.logic');
const { PIECE, BOARD_SIZE } = require('../utils/constants');

class BotService {

    // ============================================
    // GOD LEVEL CONFIGURATION
    // ============================================
    static SEARCH_DEPTH = 14;           // INSANE depth
    static MAX_THINK_TIME = 5000;       // 5 seconds max thinking
    static ENDGAME_DEPTH = 18;          // Even deeper in endgame

    // Caches
    static transpositionTable = new Map();
    static killerMoves = [];
    static historyTable = new Map();
    static nodesEvaluated = 0;

    // Opening book - proven strong opening moves
    static OPENING_BOOK = {
        // Standard openings for black (bot)
        'initial': [
            { from: { row: 2, col: 1 }, to: { row: 3, col: 0 } },
            { from: { row: 2, col: 1 }, to: { row: 3, col: 2 } },
            { from: { row: 2, col: 3 }, to: { row: 3, col: 2 } },
            { from: { row: 2, col: 3 }, to: { row: 3, col: 4 } },
            { from: { row: 2, col: 5 }, to: { row: 3, col: 4 } },
            { from: { row: 2, col: 5 }, to: { row: 3, col: 6 } },
        ]
    };

    // ============================================
    // MAIN ENTRY POINT
    // ============================================
    static getBestMove(board, botColor) {
        const startTime = Date.now();
        this.nodesEvaluated = 0;
        this.transpositionTable.clear();
        this.historyTable.clear();

        console.log('');
        console.log('👑 ==========================================');
        console.log('👑 GOD LEVEL BOT ACTIVATED');
        console.log('👑 ==========================================');

        const { moves, captures, mustCapture } = CheckersLogic.getAllValidMoves(board, botColor);
        const allMoves = mustCapture ? captures : [...captures, ...moves];

        if (allMoves.length === 0) {
            console.log('👑 No moves - accepting defeat gracefully');
            return null;
        }

        if (allMoves.length === 1) {
            console.log('👑 Forced move');
            return allMoves[0];
        }

        // Count pieces for endgame detection
        const pieceCount = this.countAllPieces(board);
        const isEndgame = pieceCount <= 8;
        const searchDepth = isEndgame ? this.ENDGAME_DEPTH : this.SEARCH_DEPTH;

        console.log('👑 Pieces remaining:', pieceCount);
        console.log('👑 Search depth:', searchDepth);
        console.log('👑 Endgame mode:', isEndgame);

        // Initialize killer moves
        this.killerMoves = Array(searchDepth + 10).fill(null).map(() => []);

        let bestMove = allMoves[0];
        let bestScore = -Infinity;
        let lastCompletedDepth = 0;

        // Iterative deepening with aspiration windows
        let alpha = -Infinity;
        let beta = Infinity;

        for (let depth = 2; depth <= searchDepth; depth++) {
            // Time check
            if (Date.now() - startTime > this.MAX_THINK_TIME * 0.8) {
                console.log('👑 Time limit approaching, stopping at depth', lastCompletedDepth);
                break;
            }

            const result = this.aspirationSearch(board, allMoves, depth, alpha, beta, botColor, startTime);

            if (result.completed) {
                bestMove = result.move;
                bestScore = result.score;
                lastCompletedDepth = depth;

                // Update aspiration window
                alpha = bestScore - 50;
                beta = bestScore + 50;

                console.log('👑 Depth', depth, '| Score:', bestScore, '| Best:',
                    `(${bestMove.from.row},${bestMove.from.col})->(${bestMove.to.row},${bestMove.to.col})`);

                // Found winning sequence
                if (bestScore > 45000) {
                    console.log('👑 CHECKMATE FOUND! Stopping search.');
                    break;
                }

                // Found losing - try harder
                if (bestScore < -45000) {
                    console.log('👑 Losing position detected, searching deeper...');
                }
            } else {
                console.log('👑 Depth', depth, 'incomplete (timeout)');
                break;
            }
        }

        const elapsed = Date.now() - startTime;
        console.log('👑 ==========================================');
        console.log('👑 DECISION MADE');
        console.log('👑 Final depth:', lastCompletedDepth);
        console.log('👑 Final score:', bestScore);
        console.log('👑 Nodes evaluated:', this.nodesEvaluated.toLocaleString());
        console.log('👑 Time:', elapsed, 'ms');
        console.log('👑 Speed:', Math.round(this.nodesEvaluated / (elapsed / 1000)).toLocaleString(), 'nodes/sec');
        console.log('👑 ==========================================');

        return bestMove;
    }

    // ============================================
    // ASPIRATION SEARCH
    // ============================================
    static aspirationSearch(board, moves, depth, alpha, beta, botColor, startTime) {
        let result = this.searchRoot(board, moves, depth, alpha, beta, botColor, startTime);

        // Re-search with wider window if score outside aspiration window
        if (result.score <= alpha || result.score >= beta) {
            result = this.searchRoot(board, moves, depth, -Infinity, Infinity, botColor, startTime);
        }

        return result;
    }

    // ============================================
    // ROOT SEARCH WITH PVS
    // ============================================
    static searchRoot(board, moves, depth, alpha, beta, botColor, startTime) {
        const oppColor = botColor === 'black' ? 'white' : 'black';
        let bestMove = moves[0];
        let bestScore = -Infinity;
        let completed = true;

        // Sort moves
        const sortedMoves = this.orderMoves(moves, board, botColor, 0, null);

        for (let i = 0; i < sortedMoves.length; i++) {
            // Time check
            if (Date.now() - startTime > this.MAX_THINK_TIME) {
                completed = false;
                break;
            }

            const move = sortedMoves[i];
            const isCapture = !!move.captured;

            let newBoard = CheckersLogic.executeMove(board, move, isCapture);

            // Execute all chain captures
            if (isCapture) {
                newBoard = this.executeAllChainCaptures(newBoard, move.to.row, move.to.col, botColor);
            }

            let score;

            if (i === 0) {
                // Full window search for first move
                score = -this.pvs(newBoard, depth - 1, -beta, -alpha, oppColor, botColor, 1, startTime, true);
            } else {
                // Null window search
                score = -this.pvs(newBoard, depth - 1, -alpha - 1, -alpha, oppColor, botColor, 1, startTime, true);

                // Re-search if promising
                if (score > alpha && score < beta) {
                    score = -this.pvs(newBoard, depth - 1, -beta, -alpha, oppColor, botColor, 1, startTime, true);
                }
            }

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }

            alpha = Math.max(alpha, score);

            if (alpha >= beta) break;
        }

        return { move: bestMove, score: bestScore, completed };
    }

    // ============================================
    // PRINCIPAL VARIATION SEARCH (PVS)
    // ============================================
    static pvs(board, depth, alpha, beta, currentColor, botColor, ply, startTime, allowNull) {
        this.nodesEvaluated++;

        // Time check
        if (this.nodesEvaluated % 5000 === 0) {
            if (Date.now() - startTime > this.MAX_THINK_TIME) {
                return this.evaluate(board, currentColor, botColor);
            }
        }

        const alphaOrig = alpha;
        const oppColor = currentColor === 'black' ? 'white' : 'black';

        // Transposition table lookup
        const boardHash = this.hashBoard(board, currentColor);
        const cached = this.transpositionTable.get(boardHash);

        if (cached && cached.depth >= depth) {
            if (cached.flag === 'EXACT') return cached.score;
            if (cached.flag === 'LOWER') alpha = Math.max(alpha, cached.score);
            if (cached.flag === 'UPPER') beta = Math.min(beta, cached.score);
            if (alpha >= beta) return cached.score;
        }

        // Get moves
        const { moves, captures, mustCapture } = CheckersLogic.getAllValidMoves(board, currentColor);
        const allMoves = mustCapture ? captures : [...captures, ...moves];

        // Terminal node - no moves = loss
        if (allMoves.length === 0) {
            return -100000 + ply; // Prefer longer survival
        }

        // Depth limit
        if (depth <= 0) {
            return this.quiescence(board, alpha, beta, currentColor, botColor, 0, startTime);
        }

        // Null move pruning (skip if in check/capture situation)
        if (allowNull && depth >= 4 && !mustCapture && captures.length === 0) {
            const nullScore = -this.pvs(board, depth - 3, -beta, -beta + 1, oppColor, botColor, ply + 1, startTime, false);
            if (nullScore >= beta) {
                return beta;
            }
        }

        // Sort moves
        const sortedMoves = this.orderMoves(allMoves, board, currentColor, ply, cached?.move);

        let bestScore = -Infinity;
        let bestMove = null;

        for (let i = 0; i < sortedMoves.length; i++) {
            const move = sortedMoves[i];
            const isCapture = !!move.captured;

            let newBoard = CheckersLogic.executeMove(board, move, isCapture);

            if (isCapture) {
                newBoard = this.executeAllChainCaptures(newBoard, move.to.row, move.to.col, currentColor);
            }

            // Extensions
            let extension = 0;
            if (isCapture) extension = 1; // Capture extension
            if (this.isPromotion(move, board)) extension = Math.max(extension, 1); // Promotion extension

            // Late move reduction
            let reduction = 0;
            if (depth >= 3 && i >= 4 && !isCapture && !mustCapture && extension === 0) {
                reduction = Math.floor(Math.sqrt(depth - 1) + Math.sqrt(i - 3));
                reduction = Math.min(reduction, depth - 2);
            }

            let score;
            const newDepth = depth - 1 + extension - reduction;

            if (i === 0) {
                score = -this.pvs(newBoard, newDepth, -beta, -alpha, oppColor, botColor, ply + 1, startTime, true);
            } else {
                // Null window
                score = -this.pvs(newBoard, newDepth, -alpha - 1, -alpha, oppColor, botColor, ply + 1, startTime, true);

                // Re-search
                if (score > alpha && (score < beta || reduction > 0)) {
                    score = -this.pvs(newBoard, depth - 1 + extension, -beta, -alpha, oppColor, botColor, ply + 1, startTime, true);
                }
            }

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }

            alpha = Math.max(alpha, score);

            if (alpha >= beta) {
                // Update killer moves
                if (!isCapture) {
                    this.killerMoves[ply] = this.killerMoves[ply] || [];
                    this.killerMoves[ply].unshift(move);
                    if (this.killerMoves[ply].length > 3) this.killerMoves[ply].pop();

                    // Update history table
                    const moveKey = this.getMoveKey(move);
                    const hist = this.historyTable.get(moveKey) || 0;
                    this.historyTable.set(moveKey, hist + depth * depth);
                }
                break;
            }
        }

        // Store in transposition table
        let flag = 'EXACT';
        if (bestScore <= alphaOrig) flag = 'UPPER';
        else if (bestScore >= beta) flag = 'LOWER';

        this.transpositionTable.set(boardHash, {
            depth,
            score: bestScore,
            flag,
            move: bestMove
        });

        // Limit table size
        if (this.transpositionTable.size > 1000000) {
            const entries = Array.from(this.transpositionTable.entries());
            entries.sort((a, b) => a[1].depth - b[1].depth);
            entries.slice(0, 200000).forEach(([k]) => this.transpositionTable.delete(k));
        }

        return bestScore;
    }

    // ============================================
    // QUIESCENCE SEARCH - Deep tactical search
    // ============================================
    static quiescence(board, alpha, beta, currentColor, botColor, depth, startTime) {
        this.nodesEvaluated++;

        const standPat = this.evaluate(board, currentColor, botColor);

        if (depth <= -10) return standPat; // Max quiescence depth

        if (standPat >= beta) return beta;

        // Delta pruning
        const DELTA = 400; // King value
        if (standPat + DELTA < alpha) return alpha;

        if (standPat > alpha) alpha = standPat;

        const { captures } = CheckersLogic.getAllValidMoves(board, currentColor);

        if (captures.length === 0) return standPat;

        const oppColor = currentColor === 'black' ? 'white' : 'black';

        // Sort captures by SEE (Static Exchange Evaluation)
        const sortedCaptures = this.orderCaptures(captures, board, currentColor);

        for (const capture of sortedCaptures) {
            // Skip clearly losing captures
            if (this.seeScore(board, capture, currentColor) < -50) continue;

            let newBoard = CheckersLogic.executeMove(board, capture, true);
            newBoard = this.executeAllChainCaptures(newBoard, capture.to.row, capture.to.col, currentColor);

            const score = -this.quiescence(newBoard, -beta, -alpha, oppColor, botColor, depth - 1, startTime);

            if (score >= beta) return beta;
            if (score > alpha) alpha = score;
        }

        return alpha;
    }

    // ============================================
    // STATIC EXCHANGE EVALUATION
    // ============================================
    static seeScore(board, capture, color) {
        const captured = board[capture.captured.row][capture.captured.col];
        const capturedValue = (captured === PIECE.BLACK_KING || captured === PIECE.WHITE_KING) ? 400 : 100;

        const attacker = board[capture.from.row][capture.from.col];
        const attackerValue = (attacker === PIECE.BLACK_KING || attacker === PIECE.WHITE_KING) ? 400 : 100;

        // Simple SEE: gain - risk
        let score = capturedValue;

        // Check if capture square is attacked by opponent
        const tempBoard = CheckersLogic.executeMove(board, capture, true);
        const oppColor = color === 'black' ? 'white' : 'black';
        const oppCaptures = CheckersLogic.getAllValidMoves(tempBoard, oppColor).captures;

        const recapture = oppCaptures.find(c => c.to.row === capture.to.row && c.to.col === capture.to.col);
        if (recapture) {
            score -= attackerValue;
        }

        return score;
    }

    // ============================================
    // ADVANCED MOVE ORDERING
    // ============================================
    static orderMoves(moves, board, color, ply, pvMove) {
        return moves.map(move => {
            let score = 0;

            // PV move from transposition table
            if (pvMove && this.movesEqual(move, pvMove)) {
                score += 100000;
            }

            // Captures (MVV-LVA with SEE)
            if (move.captured) {
                const see = this.seeScore(board, move, color);
                if (see >= 0) {
                    score += 50000 + see;
                } else {
                    score += 10000 + see; // Bad captures still before quiet moves
                }

                // Bonus for chain captures
                const tempBoard = CheckersLogic.executeMove(board, move, true);
                const chains = CheckersLogic.getMultiCaptures(tempBoard, move.to.row, move.to.col);
                score += chains.length * 5000;
            }

            // Promotion
            if (this.isPromotion(move, board)) {
                score += 40000;
            }

            // Killer moves
            if (this.killerMoves[ply]) {
                const killerIndex = this.killerMoves[ply].findIndex(km => this.movesEqual(km, move));
                if (killerIndex !== -1) {
                    score += 30000 - killerIndex * 1000;
                }
            }

            // History heuristic
            const moveKey = this.getMoveKey(move);
            const histScore = this.historyTable.get(moveKey) || 0;
            score += Math.min(histScore, 20000);

            // Positional bonuses
            score += this.getMovePositionalScore(move, board, color);

            return { move, score };
        }).sort((a, b) => b.score - a.score).map(x => x.move);
    }

    static orderCaptures(captures, board, color) {
        return captures.map(cap => {
            const see = this.seeScore(board, cap, color);
            return { move: cap, score: see };
        }).sort((a, b) => b.score - a.score).map(x => x.move);
    }

    static getMovePositionalScore(move, board, color) {
        let score = 0;

        // Center control
        const centerDist = Math.abs(3.5 - move.to.row) + Math.abs(3.5 - move.to.col);
        score += (7 - centerDist) * 10;

        // Advancement
        if (color === 'black') {
            score += move.to.row * 15;
        } else {
            score += (7 - move.to.row) * 15;
        }

        // Avoid edges
        if (move.to.col === 0 || move.to.col === 7) {
            score -= 20;
        }

        // Protected squares
        const behindRow = color === 'black' ? move.to.row - 1 : move.to.row + 1;
        if (behindRow >= 0 && behindRow < 8) {
            if (move.to.col > 0) {
                const protector = board[behindRow][move.to.col - 1];
                if (this.isPieceOfColor(protector, color)) score += 25;
            }
            if (move.to.col < 7) {
                const protector = board[behindRow][move.to.col + 1];
                if (this.isPieceOfColor(protector, color)) score += 25;
            }
        }

        return score;
    }

    // ============================================
    // GOD-TIER EVALUATION FUNCTION
    // ============================================
    static evaluate(board, currentColor, botColor) {
        const oppColor = currentColor === 'black' ? 'white' : 'black';

        // Phase detection
        const analysis = this.analyzePosition(board);
        const totalPieces = analysis.blackPieces + analysis.whitePieces + analysis.blackKings + analysis.whiteKings;
        const phase = totalPieces <= 6 ? 'endgame' : totalPieces <= 12 ? 'midgame' : 'opening';

        let score = 0;

        // ==================
        // MATERIAL EVALUATION
        // ==================
        const pieceValue = phase === 'endgame' ? 120 : 100;
        const kingValue = phase === 'endgame' ? 450 : 350;

        const blackMaterial = analysis.blackPieces * pieceValue + analysis.blackKings * kingValue;
        const whiteMaterial = analysis.whitePieces * pieceValue + analysis.whiteKings * kingValue;

        const materialScore = currentColor === 'black'
            ? blackMaterial - whiteMaterial
            : whiteMaterial - blackMaterial;

        score += materialScore;

        // ==================
        // POSITIONAL EVALUATION
        // ==================
        const blackPos = analysis.blackPositional;
        const whitePos = analysis.whitePositional;

        const posScore = currentColor === 'black' ? blackPos - whitePos : whitePos - blackPos;
        score += posScore * (phase === 'opening' ? 0.5 : 1);

        // ==================
        // MOBILITY & THREATS
        // ==================
        const currentMoves = CheckersLogic.getAllValidMoves(board, currentColor);
        const oppMoves = CheckersLogic.getAllValidMoves(board, oppColor);

        // Capture threats
        score += currentMoves.captures.length * 40;
        score -= oppMoves.captures.length * 35;

        // Mobility
        score += currentMoves.moves.length * 8;
        score -= oppMoves.moves.length * 6;

        // ==================
        // KING SAFETY & ACTIVITY
        // ==================
        const myKings = currentColor === 'black' ? analysis.blackKings : analysis.whiteKings;
        const oppKings = currentColor === 'black' ? analysis.whiteKings : analysis.blackKings;

        score += analysis.kingMobility[currentColor] * 8;
        score -= analysis.kingMobility[oppColor] * 6;

        // ==================
        // STRUCTURE EVALUATION
        // ==================
        score += analysis.structure[currentColor] * 15;
        score -= analysis.structure[oppColor] * 12;

        // ==================
        // TEMPO BONUS (having the move)
        // ==================
        score += 10;

        // ==================
        // ENDGAME SPECIFIC
        // ==================
        if (phase === 'endgame') {
            // King centralization in endgame
            score += analysis.kingCentralization[currentColor] * 20;
            score -= analysis.kingCentralization[oppColor] * 15;

            // Piece advancement more important
            score += analysis.advancement[currentColor] * 25;
            score -= analysis.advancement[oppColor] * 20;
        }

        return Math.round(score);
    }

    // ============================================
    // DEEP POSITION ANALYSIS
    // ============================================
    static analyzePosition(board) {
        let blackPieces = 0, whitePieces = 0;
        let blackKings = 0, whiteKings = 0;
        let blackPositional = 0, whitePositional = 0;

        const kingMobility = { black: 0, white: 0 };
        const kingCentralization = { black: 0, white: 0 };
        const structure = { black: 0, white: 0 };
        const advancement = { black: 0, white: 0 };

        // Advanced positional weights
        const posWeights = [
            [1, 0, 4, 0, 4, 0, 4, 0],
            [0, 3, 0, 3, 0, 3, 0, 1],
            [1, 0, 4, 0, 5, 0, 4, 0],
            [0, 4, 0, 6, 0, 5, 0, 1],
            [1, 0, 5, 0, 6, 0, 4, 0],
            [0, 4, 0, 5, 0, 4, 0, 1],
            [1, 0, 3, 0, 3, 0, 3, 0],
            [0, 4, 0, 4, 0, 4, 0, 1]
        ];

        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const piece = board[row][col];
                if (piece === PIECE.EMPTY) continue;

                const posWeight = posWeights[row][col] * 4;
                const centerDist = Math.abs(3.5 - row) + Math.abs(3.5 - col);

                switch (piece) {
                    case PIECE.BLACK:
                        blackPieces++;
                        blackPositional += posWeight;
                        advancement.black += row * 8;

                        // Back row defense
                        if (row === 0) blackPositional += 20;

                        // Close to promotion
                        if (row >= 5) blackPositional += (row - 4) * 15;
                        if (row === 7) blackPositional += 50; // Actually promoted

                        // Protected piece
                        structure.black += this.getProtectionScore(board, row, col, 'black');
                        break;

                    case PIECE.WHITE:
                        whitePieces++;
                        whitePositional += posWeight;
                        advancement.white += (7 - row) * 8;

                        if (row === 7) whitePositional += 20;
                        if (row <= 2) whitePositional += (3 - row) * 15;
                        if (row === 0) whitePositional += 50;

                        structure.white += this.getProtectionScore(board, row, col, 'white');
                        break;

                    case PIECE.BLACK_KING:
                        blackKings++;
                        blackPositional += posWeight * 1.5;
                        kingMobility.black += this.getKingMobility(board, row, col);
                        kingCentralization.black += Math.max(0, 7 - centerDist * 2);
                        break;

                    case PIECE.WHITE_KING:
                        whiteKings++;
                        whitePositional += posWeight * 1.5;
                        kingMobility.white += this.getKingMobility(board, row, col);
                        kingCentralization.white += Math.max(0, 7 - centerDist * 2);
                        break;
                }
            }
        }

        return {
            blackPieces, whitePieces, blackKings, whiteKings,
            blackPositional, whitePositional,
            kingMobility, kingCentralization, structure, advancement
        };
    }

    static getProtectionScore(board, row, col, color) {
        let score = 0;
        const behindRow = color === 'black' ? row - 1 : row + 1;

        if (behindRow >= 0 && behindRow < 8) {
            if (col > 0 && this.isPieceOfColor(board[behindRow][col - 1], color)) score += 10;
            if (col < 7 && this.isPieceOfColor(board[behindRow][col + 1], color)) score += 10;
        }

        // Double diagonal protection
        const frontRow = color === 'black' ? row + 1 : row - 1;
        if (frontRow >= 0 && frontRow < 8) {
            if (col > 0 && this.isPieceOfColor(board[frontRow][col - 1], color)) score += 5;
            if (col < 7 && this.isPieceOfColor(board[frontRow][col + 1], color)) score += 5;
        }

        return score;
    }

    static getKingMobility(board, row, col) {
        let mobility = 0;
        const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

        for (const [dr, dc] of directions) {
            for (let dist = 1; dist < 8; dist++) {
                const nr = row + dr * dist;
                const nc = col + dc * dist;

                if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) break;
                if (board[nr][nc] !== PIECE.EMPTY) break;

                mobility++;
            }
        }

        return mobility;
    }

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    static executeAllChainCaptures(board, row, col, color) {
        let currentBoard = board;
        let currentRow = row;
        let currentCol = col;

        while (true) {
            const captures = CheckersLogic.getMultiCaptures(currentBoard, currentRow, currentCol);
            if (captures.length === 0) break;

            // Pick best chain capture using SEE
            let bestCapture = captures[0];
            let bestScore = -Infinity;

            for (const cap of captures) {
                const tempBoard = CheckersLogic.executeMove(currentBoard, cap, true);
                const see = this.quickEval(tempBoard, color);
                const chains = CheckersLogic.getMultiCaptures(tempBoard, cap.to.row, cap.to.col);
                const score = see + chains.length * 100;

                if (score > bestScore) {
                    bestScore = score;
                    bestCapture = cap;
                }
            }

            currentBoard = CheckersLogic.executeMove(currentBoard, bestCapture, true);
            currentRow = bestCapture.to.row;
            currentCol = bestCapture.to.col;
        }

        return currentBoard;
    }

    static quickEval(board, botColor) {
        let score = 0;

        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const piece = board[row][col];
                if (piece === PIECE.EMPTY) continue;

                const isBlack = piece === PIECE.BLACK || piece === PIECE.BLACK_KING;
                const isKing = piece === PIECE.BLACK_KING || piece === PIECE.WHITE_KING;
                const isBotPiece = (botColor === 'black') === isBlack;

                const value = isKing ? 350 : 100;
                score += isBotPiece ? value : -value;
            }
        }

        return score;
    }

    static countAllPieces(board) {
        let count = 0;
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (board[row][col] !== PIECE.EMPTY) count++;
            }
        }
        return count;
    }

    static isPromotion(move, board) {
        const piece = board[move.from.row][move.from.col];
        if (piece === PIECE.BLACK && move.to.row === 7) return true;
        if (piece === PIECE.WHITE && move.to.row === 0) return true;
        return false;
    }

    static isPieceOfColor(piece, color) {
        if (color === 'black') {
            return piece === PIECE.BLACK || piece === PIECE.BLACK_KING;
        }
        return piece === PIECE.WHITE || piece === PIECE.WHITE_KING;
    }

    static movesEqual(m1, m2) {
        if (!m1 || !m2) return false;
        return m1.from.row === m2.from.row && m1.from.col === m2.from.col &&
            m1.to.row === m2.to.row && m1.to.col === m2.to.col;
    }

    static getMoveKey(move) {
        return `${move.from.row},${move.from.col}-${move.to.row},${move.to.col}`;
    }

    static hashBoard(board, color) {
        let hash = color;
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                hash += board[row][col];
            }
        }
        return hash;
    }
}

module.exports = BotService;