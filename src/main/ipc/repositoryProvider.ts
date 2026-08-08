import { SqliteGameRepository } from "../../infrastructure/database/repositories/SqliteGameRepository";


let gameRepository: SqliteGameRepository | null = null;


export function setGameRepository(
    repository: SqliteGameRepository
): void {

    gameRepository = repository;

}


export function getGameRepository(): SqliteGameRepository {

    if (!gameRepository) {

        throw new Error(
            "Game repository has not been initialized"
        );

    }


    return gameRepository;

}