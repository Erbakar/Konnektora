import { Controller, Get, Headers, Query } from "@nestjs/common";
import { LocationsService } from "./locations.service";

@Controller("locations")
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  @Get("geocode")
  geocode(
    @Query("q") query = "",
    @Headers("accept-language") language = "tr",
  ) {
    return this.locations.geocode(query, language);
  }
}
