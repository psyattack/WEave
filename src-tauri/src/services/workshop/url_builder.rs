//! URL construction for Steam Workshop browsing. Ports
//! `workshop_url_builder.py` — including the exact parameter names so
//! results match 1:1 with the original app.

use url::form_urlencoded;

use crate::constants::STEAM_APP_ID;
use crate::workshop::WorkshopFilters;

const BASE_URL: &str = "https://steamcommunity.com/workshop/browse/";

pub fn build_browse(filters: &WorkshopFilters) -> String {
    let mut builder = form_urlencoded::Serializer::new(String::new());
    let c_start = if filters.created_date_range_start.is_empty() { "0" } else { &filters.created_date_range_start };
    let c_end = if filters.created_date_range_end.is_empty() { "0" } else { &filters.created_date_range_end };
    let u_start = if filters.updated_date_range_start.is_empty() { "0" } else { &filters.updated_date_range_start };
    let u_end = if filters.updated_date_range_end.is_empty() { "0" } else { &filters.updated_date_range_end };

    builder
        .append_pair("appid", STEAM_APP_ID)
        .append_pair("browsesort", &filters.sort)
        .append_pair("section", "readytouseitems")
        .append_pair("p", &filters.page.max(1).to_string())
        .append_pair("childpublishedfileid", "0")
        .append_pair("created_date_range_filter_start", c_start)
        .append_pair("created_date_range_filter_end", c_end)
        .append_pair("updated_date_range_filter_start", u_start)
        .append_pair("updated_date_range_filter_end", u_end)
        .append_pair("actualsort", &filters.sort);

    if filters.sort == "trend" && !filters.days.is_empty() {
        builder.append_pair("days", &filters.days);
    }
    if !filters.search.is_empty() {
        builder.append_pair("searchtext", &filters.search);
        if filters.search_text_mode > 0 {
            builder.append_pair("search_text_mode", &filters.search_text_mode.to_string());
        }
    }
    add_tag_params(&mut builder, filters);
    format!("{BASE_URL}?{}", builder.finish())
}

pub fn build_collections_browse(filters: &WorkshopFilters) -> String {
    let mut builder = form_urlencoded::Serializer::new(String::new());
    builder
        .append_pair("appid", STEAM_APP_ID)
        .append_pair("browsesort", &filters.sort)
        .append_pair("section", "collections")
        .append_pair("p", &filters.page.max(1).to_string())
        .append_pair("actualsort", &filters.sort);

    if filters.sort == "trend" && !filters.days.is_empty() {
        builder.append_pair("days", &filters.days);
    }
    if !filters.search.is_empty() {
        builder.append_pair("searchtext", &filters.search);
        if filters.search_text_mode > 0 {
            builder.append_pair("search_text_mode", &filters.search_text_mode.to_string());
        }
    }
    add_tag_params(&mut builder, filters);
    format!("{BASE_URL}?{}", builder.finish())
}

pub fn build_author_items(profile_url: &str, filters: &WorkshopFilters) -> String {
    let base = format!("{}/myworkshopfiles/", profile_url.trim_end_matches('/'));
    let mut builder = form_urlencoded::Serializer::new(String::new());
    builder
        .append_pair("appid", STEAM_APP_ID)
        .append_pair("p", &filters.page.max(1).to_string());
    if !filters.search.is_empty() {
        builder.append_pair("searchtext", &filters.search);
        if filters.search_text_mode > 0 {
            builder.append_pair("search_text_mode", &filters.search_text_mode.to_string());
        }
    }
    add_tag_params(&mut builder, filters);
    format!("{base}?{}", builder.finish())
}

pub fn build_author_collections(profile_url: &str, filters: &WorkshopFilters) -> String {
    let base = format!("{}/myworkshopfiles/", profile_url.trim_end_matches('/'));
    let mut builder = form_urlencoded::Serializer::new(String::new());
    builder
        .append_pair("appid", STEAM_APP_ID)
        .append_pair("section", "collections")
        .append_pair("p", &filters.page.max(1).to_string());
    if !filters.search.is_empty() {
        builder.append_pair("searchtext", &filters.search);
        if filters.search_text_mode > 0 {
            builder.append_pair("search_text_mode", &filters.search_text_mode.to_string());
        }
    }
    add_tag_params(&mut builder, filters);
    format!("{base}?{}", builder.finish())
}

pub fn build_collection_url(collection_id: &str) -> String {
    format!(
        "https://steamcommunity.com/sharedfiles/filedetails/?id={collection_id}"
    )
}

fn add_tag_params<'a>(
    builder: &mut form_urlencoded::Serializer<'a, String>,
    filters: &WorkshopFilters,
) {
    let mut required: Vec<&str> = Vec::new();
    if !filters.category.is_empty() {
        required.push(&filters.category);
    }
    if !filters.type_tag.is_empty() {
        required.push(&filters.type_tag);
    }
    if !filters.age_rating.is_empty() {
        required.push(&filters.age_rating);
    }
    if !filters.resolution.is_empty() {
        required.push(&filters.resolution);
    }
    if !filters.asset_type.is_empty() {
        required.push(&filters.asset_type);
    }
    if !filters.asset_genre.is_empty() {
        required.push(&filters.asset_genre);
    }
    if !filters.script_type.is_empty() {
        required.push(&filters.script_type);
    }
    for tag in &filters.misc_tags {
        required.push(tag);
    }
    for tag in &filters.genre_tags {
        required.push(tag);
    }
    for tag in required {
        builder.append_pair("requiredtags[]", tag);
    }

    let mut excluded: Vec<&str> = Vec::new();
    for tag in &filters.excluded_misc_tags {
        excluded.push(tag);
    }
    for tag in &filters.excluded_genre_tags {
        excluded.push(tag);
    }
    for tag in excluded {
        builder.append_pair("excludedtags[]", tag);
    }

    for flag in &filters.required_flags {
        builder.append_pair("requiredflags[]", flag);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_browse() {
        let mut filters = WorkshopFilters::default();
        filters.sort = "trend".to_string();
        filters.days = "7".to_string();
        filters.search = "cyberpunk".to_string();
        filters.page = 2;
        filters.category = "scene".to_string();

        filters.required_flags = vec!["incompatible".to_string()];
        filters.created_date_range_start = "1704067200".to_string();

        let url = build_browse(&filters);
        assert!(url.contains("browsesort=trend"));
        assert!(url.contains("days=7"));
        assert!(url.contains("searchtext=cyberpunk"));
        assert!(url.contains("p=2"));
        assert!(url.contains("requiredtags%5B%5D=scene"));
        assert!(url.contains("requiredflags%5B%5D=incompatible"));
        assert!(url.contains("created_date_range_filter_start=1704067200"));
        assert!(url.contains("appid="));
    }
}
