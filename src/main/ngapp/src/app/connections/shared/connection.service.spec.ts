import { inject, TestBed } from "@angular/core/testing";
import { HttpModule } from "@angular/http";
import { ConnectionService } from "@connections/shared/connection.service";
import { AppSettingsService } from "@core/app-settings.service";
import { LoggerService } from "@core/logger.service";

describe("ConnectionService", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ HttpModule ],
      providers: [AppSettingsService, ConnectionService, LoggerService]
    });
  });

  it("should be created", inject([ConnectionService, AppSettingsService, LoggerService],
                                            (service: ConnectionService ) => {
    expect(service).toBeTruthy();
  }));
});
