/**
 * @license
 * Copyright 2017 JBoss Inc
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Component, OnInit } from "@angular/core";
import { EventEmitter } from "@angular/core";
import { Output } from "@angular/core";
import { Input } from "@angular/core";
import { Connection } from "@connections/shared/connection.model";
import { ConnectionService } from "@connections/shared/connection.service";
import { JdbcTableFilter } from "@connections/shared/jdbc-table-filter.model";
import { SchemaInfo } from "@connections/shared/schema-info.model";
import { LoggerService } from "@core/logger.service";
import { CatalogSchema } from "@dataservices/shared/catalog-schema.model";
import { TableSelector } from "@dataservices/shared/table-selector";
import { Table } from "@dataservices/shared/table.model";
import { WizardService } from "@dataservices/shared/wizard.service";
import { LoadingState } from "@shared/loading-state.enum";

@Component({
  selector: "app-jdbc-table-selector",
  templateUrl: "./jdbc-table-selector.component.html",
  styleUrls: ["./jdbc-table-selector.component.css"]
})

export class JdbcTableSelectorComponent implements OnInit, TableSelector {

  @Input() public connection: Connection;
  @Output() public tableSelectionAdded: EventEmitter<Table> = new EventEmitter<Table>();
  @Output() public tableSelectionRemoved: EventEmitter<Table> = new EventEmitter<Table>();

  private connectionService: ConnectionService;
  private wizardService: WizardService;
  private logger: LoggerService;
  private schemas: CatalogSchema[] = [];
  private tables: Table[] = [];
  private currentSchema: CatalogSchema = null;
  private schemaLoadingState: LoadingState = LoadingState.LOADING;
  private tableLoadingState: LoadingState = LoadingState.LOADING;

  constructor(connectionService: ConnectionService, wizardService: WizardService, logger: LoggerService ) {
    this.connectionService = connectionService;
    this.wizardService = wizardService;
    this.logger = logger;
  }

  public ngOnInit(): void {
    // Load the schema info for a connection
    this.setConnection(this.connection);
  }

  /*
   * Set the connection for this jdbc table selector
   * @param {Connection} conn the jdbc connection
   */
  public setConnection(conn: Connection): void {
    this.clearSchemas();
    this.clearTables();
    if (conn && conn.isJdbc()) {
      this.connection = conn;
      // Load the schema info for a connection
      this.schemaLoadingState = LoadingState.LOADING;
      const self = this;
      this.connectionService
        .getConnectionSchemaInfos(this.connection.getId())
        .subscribe(
          (infos) => {
            self.generateSchemaNames(infos);
            self.schemaLoadingState = LoadingState.LOADED_VALID;
          },
          (error) => {
            self.logger.error("[JdbcTableSelectorComponent] Error getting schemas: %o", error);
            self.schemaLoadingState = LoadingState.LOADED_INVALID;
          }
        );
    } else {
      this.schemaLoadingState = LoadingState.LOADING;
    }
  }

  public clearSchemas(): void {
    this.schemas = [];
    this.currentSchema = null;
  }

  public clearTables(): void {
    this.tables = [];
    this.tableLoadingState = LoadingState.LOADING;
  }

  /*
   * Toggle the schema selection
   * @param {CatalogSchema} schema the schema that has been selected or deselected
   */
  public toggleSchemaSelected(schema: CatalogSchema): void {
    if (this.isSchemaSelected(schema)) {
      this.currentSchema = null;
      // Deselection of schema clears tables
      this.tables = [];
    } else {
      this.currentSchema = schema;
      const filterInfo = new JdbcTableFilter();
      filterInfo.setConnectionName(this.connection.getId());
      filterInfo.setCatalogFilter(schema.getCatalogName());
      filterInfo.setSchemaFilter(schema.getName());
      filterInfo.setTableFilter("%");
      this.loadTablesForSchema(filterInfo);
    }
  }

  /*
   * Determines if the provided schema is selected
   * @param {CatalogSchema} schema the CatalogSchema to check
   */
  public isSchemaSelected(schema: CatalogSchema): boolean {
    return schema === this.currentSchema;
  }

  /*
   * Returns the currently selected schema.
   * @returns {CatalogSchema} the selected schema
   */
  public get selectedSchema( ): CatalogSchema {
    return this.currentSchema;
  }

  /*
   * Returns the currently selected schema.
   * @returns {CatalogSchema} the selected schema
   */
  public get hasSelectedSchema( ): boolean {
    return this.currentSchema != null;
  }

  /**
   * Determine if schemas are loading
   */
  public get schemasLoading( ): boolean {
    return this.schemaLoadingState === LoadingState.LOADING;
  }

  /**
   * Determine if schemas are loaded, valid and not empty
   */
  public get schemasLoadedValidNotEmpty( ): boolean {
    return (this.schemaLoadingState === LoadingState.LOADED_VALID) && this.schemas.length > 0;
  }

  /**
   * Determine if schemas are loaded, valid but empty
   */
  public get schemasLoadedValidEmpty( ): boolean {
    return (this.schemaLoadingState === LoadingState.LOADED_VALID) && this.schemas.length === 0;
  }

  /**
   * Determine if schemas are loaded and invalid
   */
  public get schemasLoadedInvalid( ): boolean {
    return this.schemaLoadingState === LoadingState.LOADED_INVALID;
  }

  /*
   * Get all schemas
   * @returns {CatalogSchema[]} the array of schema
   */
  public getSchemas(): CatalogSchema[] {
    return this.schemas;
  }

  /**
   * Determine if tables are loading
   */
  public get tablesLoading( ): boolean {
    return this.tableLoadingState === LoadingState.LOADING;
  }

  /**
   * Determine if tables are loaded, valid and not empty
   */
  public get tablesLoadedValidNotEmpty( ): boolean {
    return (this.tableLoadingState === LoadingState.LOADED_VALID) && this.tables.length > 0;
  }

  /**
   * Determine if tables are loaded, valid but empty
   */
  public get tablesLoadedValidEmpty( ): boolean {
    return (this.tableLoadingState === LoadingState.LOADED_VALID) && this.tables.length === 0;
  }

  /**
   * Determine if tables are loaded and invalid
   */
  public get tablesLoadedInvalid( ): boolean {
    return this.tableLoadingState === LoadingState.LOADED_INVALID;
  }

  /*
   * Get all tables
   * @returns {Table[]} the current tables for the selected schema
   */
  public getTables(): Table[] {
    return this.tables;
  }

  /*
   * Determine if any tables are currently selected
   * @returns {boolean} true if one or more tables are selected
   */
  public hasSelectedTables(): boolean {
    return this.getSelectedTables().length > 0;
  }

  /*
   * Get the array of currently selected Tables
   * @returns {Table[]} the array of selected Tables
   */
  public getSelectedTables(): Table[] {
    const selectedTables = [];
    for ( const tbl of this.getTables() ) {
      if (tbl.selected) {
        selectedTables.push(tbl);
      }
    }
    return selectedTables;
  }

  /*
   * Handler for changes in table selection
   */
  public selectedTablesChanged(table: Table): void {
    if (table.selected) {
      this.tableSelectionAdded.emit(table);
    } else {
      this.tableSelectionRemoved.emit(table);
    }
  }

  /*
   * Builds the array of CatalogSchema items from the SchemaInfo coming from
   * the Komodo rest call
   * @param {SchemaInfo[]} infos the array of SchemaInfo from komodo
   */
  private generateSchemaNames(infos: SchemaInfo[]): void {
    for (const info of infos) {
      const infoName = info.getName();
      const infoType = info.getType();
      const schemaNames = info.getSchemaNames();
      if (infoType === "Catalog") {
        if (schemaNames && schemaNames.length > 0) {
          for (const sName of schemaNames) {
            const item: CatalogSchema = new CatalogSchema();
            item.setName(sName);
            item.setType("Schema");
            item.setCatalogName(infoName);
            this.schemas.push(item);
          }
        } else {
          const item: CatalogSchema = new CatalogSchema();
          item.setName(infoName);
          item.setType("Catalog");
          this.schemas.push(item);
        }
      } else if (infoType === "Schema") {
        const item: CatalogSchema = new CatalogSchema();
        item.setName(infoName);
        item.setType("Schema");
        this.schemas.push(item);
      }
    }
  }

  /*
   * Populates tables array, given the supplied JdbcTableFilter
   * @para {JdbcTableFilter} tableFilter the filters for getting tables
   */
  private loadTablesForSchema(tableFilter: JdbcTableFilter): void {
    // Load the table names for the selected Connection and Schema
    this.tables = [];
    this.tableLoadingState = LoadingState.LOADING;
    const self = this;
    this.connectionService
      .getJdbcConnectionTables(tableFilter)
      .subscribe(
        (tableNames) => {
          for ( const tName of tableNames ) {
            const table = new Table();
            table.setName(tName);
            table.setConnection(self.connection);
            table.setCatalogName(self.selectedSchema.getCatalogName());
            table.setSchemaName(self.selectedSchema.getName());
            self.tables.push(table);
          }
          // select any of the tables that are already selected
          self.setInitialTableSelections();
          self.tableLoadingState = LoadingState.LOADED_VALID;
        },
        (error) => {
          self.logger.error("[JdbcTableSelectorComponent] Error getting tables: %o", error);
          self.tableLoadingState = LoadingState.LOADED_INVALID;
        }
      );
  }

  private setInitialTableSelections(): void {
    for ( const table of this.tables ) {
      // const catName = table.getCatalogName();
      const schemaName = table.getSchemaName();
      const tableName = table.getName();
      const connName = table.getConnection().getId();
      for ( const initialTable of this.wizardService.getWizardSelectedTables() ) {
        // const iCatName = initialTable.getCatalogName();
        const iSchemaName = initialTable.getSchemaName();
        const iTableName = initialTable.getName();
        const iConnName = initialTable.getConnection().getId();
        if (iConnName === connName && iTableName === tableName && iSchemaName === schemaName ) {
          table.selected = true;
          break;
        }
      }
    }
  }

}
