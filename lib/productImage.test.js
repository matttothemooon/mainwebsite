import assert from "node:assert/strict";
import test from "node:test";
import { imageFromHtml, imageFromAmazonSearch } from "./productImage.js";

test("reads og:image and resolves relative URLs", () => {
  const html = '<meta property="og:image" content="/img/p.jpg">';
  assert.equal(imageFromHtml(html, "https://shop.example/p/1"), "https://shop.example/img/p.jpg");
});

test("skips a site logo offered as og:image", () => {
  const html = '<meta property="og:image" content="https://shop.example/logo-square.png">';
  assert.equal(imageFromHtml(html, "https://shop.example/"), null);
});

test("uses Amazon's main product photo", () => {
  const html = '<img alt="x" id="landingImage" data-old-hires="https://m.media-amazon.com/images/I/abc._AC_SL1500_.jpg" src="https://m.media-amazon.com/images/I/abc._AC_SY355_.jpg">';
  assert.equal(imageFromHtml(html, "https://www.amazon.com/dp/1"), "https://m.media-amazon.com/images/I/abc._AC_SL1500_.jpg");
});

test("Amazon search: only a result naming the model number counts", () => {
  const html =
    '<img class="s-image" src="https://m.media-amazon.com/images/I/wrong._AC_UY218_.jpg" alt="AOC 24 Inch Monitor 24G51F2">' +
    '<img class="s-image" src="https://m.media-amazon.com/images/I/right._AC_UY218_.jpg" alt="ASUS TUF Gaming VG27VQM Monitor">';
  assert.equal(imageFromAmazonSearch(html, "AOC 24G1WG3"), null);
  assert.equal(
    imageFromAmazonSearch(html, "ASUS VG27VQM"),
    "https://m.media-amazon.com/images/I/right._AC_SL500_.jpg"
  );
});
