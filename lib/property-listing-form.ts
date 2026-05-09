import { normalizeGeolocationInput } from "@/lib/geo";

export type PropertyListingFormFields = {
    title: string;
    price: string;
    bedrooms: string;
    bathrooms: string;
    area: string;
    facilitiesText: string;
    geolocation: string;
    location: string;
    description: string;
};

export type ValidPropertyListingForm = {
    valid: true;
    parsedPrice: number;
    parsedBedrooms: number;
    parsedBathrooms: number;
    parsedArea: number;
    parsedFacilities: string[];
    formattedGeolocation: string;
};

export type InvalidPropertyListingForm = {
    valid: false;
    alertTitle: string;
    alertMessage: string;
};

export type PropertyListingFormValidation =
    | ValidPropertyListingForm
    | InvalidPropertyListingForm;

/** Shared listing form parsing + validation used by add/edit property screens. */
export function validatePropertyListingForm(
    fields: PropertyListingFormFields
): PropertyListingFormValidation {
    const parsedPrice = Number(fields.price);
    const parsedBedrooms = Number(fields.bedrooms);
    const parsedBathrooms = Number(fields.bathrooms);
    const parsedArea = Number(fields.area);
    const parsedFacilities = fields.facilitiesText
        .split(",")
        .map((facility) => facility.trim())
        .filter(Boolean);
    const formattedGeolocation = normalizeGeolocationInput(fields.geolocation);

    if (
        !fields.title.trim() ||
        !fields.location.trim() ||
        !fields.description.trim() ||
        Number.isNaN(parsedPrice) ||
        parsedPrice <= 0
    ) {
        return {
            valid: false,
            alertTitle: "Missing details",
            alertMessage:
                "Please enter title, valid price, location, and description.",
        };
    }

    if (
        Number.isNaN(parsedBedrooms) ||
        Number.isNaN(parsedBathrooms) ||
        Number.isNaN(parsedArea) ||
        parsedBedrooms < 0 ||
        parsedBathrooms < 0 ||
        parsedArea < 0
    ) {
        return {
            valid: false,
            alertTitle: "Invalid values",
            alertMessage:
                "Bedrooms, bathrooms, and area must be valid non-negative numbers.",
        };
    }

    return {
        valid: true,
        parsedPrice,
        parsedBedrooms,
        parsedBathrooms,
        parsedArea,
        parsedFacilities,
        formattedGeolocation,
    };
}
