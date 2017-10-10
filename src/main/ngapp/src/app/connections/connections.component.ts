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

import { Component, ViewChild } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { Connection } from "@connections/shared/connection.model";
import { ConnectionService } from "@connections/shared/connection.service";
import { ConnectionsConstants } from "@connections/shared/connections-constants";
import { NewConnection } from "@connections/shared/new-connection.model";
import { ArrayUtils } from "@core/utils/array-utils";
import { AbstractPageComponent } from "@shared/abstract-page.component";
import { ConfirmDeleteComponent } from "@shared/confirm-delete/confirm-delete.component";
import { IdFilter } from "@shared/id-filter";
import { LayoutType } from "@shared/layout-type.enum";
import { SortDirection } from "@shared/sort-direction.enum";

@Component({
  moduleId: module.id,
  selector: "app-connections",
  templateUrl: "./connections.component.html",
  styleUrls: ["./connections.component.css"],
  providers: [ConnectionService]
})
export class ConnectionsComponent extends AbstractPageComponent {

  public readonly addConnectionLink: string = ConnectionsConstants.addConnectionPath;

  private allConnections: Connection[] = [];
  private filteredConnections: Connection[] = [];
  private selectedConnections: Connection[] = [];
  private connectionNameForDelete: string;
  private router: Router;
  private connectionService: ConnectionService;
  private filter: IdFilter = new IdFilter();
  private layout: LayoutType = LayoutType.CARD;
  private sortDirection: SortDirection;

  @ViewChild(ConfirmDeleteComponent) private confirmDeleteDialog: ConfirmDeleteComponent;

  constructor(router: Router, route: ActivatedRoute, connectionService: ConnectionService) {
    super(route);
    this.router = router;
    this.connectionService = connectionService;
  }

  public loadAsyncPageData(): void {
    this.connectionService
      .getAllConnections()
      .subscribe(
        (connections) => {
          this.allConnections = connections;
          this.filteredConnections = this.filterConnections();
          this.loaded("connections");
        },
        (error) => {
          console.error("[ConnectionsComponent] Error getting connections.");
          this.error(error);
        }
      );
  }

  /**
   * Filters and sorts the list of connections based on the user input
   */
  private filterConnections(): Connection[] {
    // Clear the array first.
    this.filteredConnections.splice(0, this.filteredConnections.length);
    for (const connection of this.allConnections) {
      if (this.filter.accepts(connection)) {
        this.filteredConnections.push(connection);
      }
    }
    this.filteredConnections.sort( (c1: Connection, c2: Connection) => {
      let rval: number = c1.getId().localeCompare(c2.getId());
      if (this.sortDirection === SortDirection.DESC) {
        rval *= -1;
      }
      return rval;
    });

    this.selectedConnections = ArrayUtils.intersect(this.selectedConnections, this.filteredConnections);

    return this.filteredConnections;
  }

  /**
   * @returns {boolean} true if connections are being represented by cards
   */
  public get isCardLayout(): boolean {
    return this.layout === LayoutType.CARD;
  }

  /**
   * @returns {boolean} true if connections are being represented by items in a list
   */
  public get isListLayout(): boolean {
    return this.layout === LayoutType.LIST;
  }

  /**
   * @returns {boolean} true if sorting connection names in ascending order
   */
  public get isSortAscending(): boolean {
    return this.sortDirection === SortDirection.ASC;
  }

  /**
   * @returns {boolean} true if sorting connection names in descending order
   */
  public get isSortDescending(): boolean {
    return this.sortDirection === SortDirection.DESC;
  }

  /**
   * @returns {string} the pattern the connection names are being matched to (can be null or empty)
   */
  public get nameFilter(): string {
    return this.filter.getPattern();
  }

  /**
   * @param {string} pattern the new pattern for the connection name filter (can be null or empty)
   */
  public set nameFilter( pattern: string ) {
    this.filter.setFilter( pattern );
  }

  public onPing( connName: string): void {
    alert("Ping connection " + connName);
  }

  public onSelected(connection: Connection): void {
    // Only allow one item to be selected
    this.selectedConnections.shift();
    this.selectedConnections.push(connection);
  }

  public onDeselected(connection: Connection): void {
    // Only one item is selected at a time
    this.selectedConnections.shift();
    // this.selectedConnections.splice(this.selectedConnections.indexOf(connection), 1);
  }

  public onEdit(connName: string): void {
    const link: string[] = [ ConnectionsConstants.editConnectionPath ];
    this.router.navigate(link);
  }

  public onDelete(connName: string): void {
    this.connectionNameForDelete = connName;
    this.confirmDeleteDialog.open();
  }

  public isFiltered(): boolean {
    return this.allConnections.length !== this.filteredConnections.length;
  }

  public toggleSortDirection(): void {
    if (this.sortDirection === SortDirection.ASC) {
      this.sortDirection = SortDirection.DESC;
    } else {
      this.sortDirection = SortDirection.ASC;
    }
    this.filterConnections();
  }

  public clearFilters(): void {
    this.filter.reset();
    this.filterConnections();
  }

  public onListLayout(): void {
    this.layout = LayoutType.LIST;
  }

  public onCardLayout(): void {
    this.layout = LayoutType.CARD;
  }

  /**
   * Called to doDelete all selected APIs.
   */
  public deleteConnection(): void {
    const selectedConn =  this.filterConnections().find((x) => x.getId() === this.connectionNameForDelete);

    // const itemsToDelete: Connection[] = ArrayUtils.intersect(this.selectedConnections, this.filteredConnections);
    // const selectedConn = itemsToDelete[0];

    const connectionToDelete: NewConnection = new NewConnection();
    connectionToDelete.setName(selectedConn.getId());

    // Note: we can only doDelete selected items that we can see in the UI.
    console.log("[ConnectionsPageComponent] Deleting selected Connection.");
    this.connectionService
      .deleteConnection(connectionToDelete)
      .subscribe(
        () => {
          this.removeConnectionFromList(selectedConn);
          const link: string[] = [ ConnectionsConstants.connectionsRootPath ];
          console.log("[CreateApiPageComponent] Navigating to: %o", link);
          this.router.navigate(link);
        }
      );
  }

  private removeConnectionFromList(connection: Connection): void {
    this.allConnections.splice(this.allConnections.indexOf(connection), 1);
    this.filterConnections();
  }
}