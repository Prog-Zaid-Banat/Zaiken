import Database from "better-sqlite3";

export class DatabaseConnection {

    private connection!: Database.Database;


    initialize(path:string){

        this.connection = new Database(path);

        this.connection.pragma(
            "journal_mode=WAL"
        );

        this.connection.pragma(
            "foreign_keys=ON"
        );
    }


    getConnection(){
        return this.connection;
    }


    close(){
        if(this.connection){
            this.connection.close();
        }
    }
}