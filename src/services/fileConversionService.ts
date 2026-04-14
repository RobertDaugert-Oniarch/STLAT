import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";
import type { LectureSection } from "../types/lecture";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

let sectionCounter = 0;

function generateSectionId(): string {
  sectionCounter += 1;
  return `s-${Date.now()}-${sectionCounter}`;
}

function splitHtmlToSections(html: string): LectureSection[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const sections: LectureSection[] = [];
  let currentTitle = "Untitled Section";
  let currentContent = "";

  for (const node of Array.from(doc.body.childNodes)) {
    const el = node as HTMLElement;
    const tag = el.tagName?.toUpperCase();

    if (tag === "H1" || tag === "H2" || tag === "H3") {
      if (currentContent.trim()) {
        sections.push({
          id: generateSectionId(),
          title: currentTitle,
          content: currentContent.trim(),
        });
      }
      currentTitle = el.textContent?.trim() || "Untitled Section";
      currentContent = "";
    } else {
      currentContent += htmlNodeToMarkdown(el);
    }
  }

  if (currentContent.trim()) {
    sections.push({
      id: generateSectionId(),
      title: currentTitle,
      content: currentContent.trim(),
    });
  }

  if (sections.length === 0 && html.trim()) {
    sections.push({
      id: generateSectionId(),
      title: "Section 1",
      content: doc.body.textContent?.trim() || "",
    });
  }

  return sections;
}

function htmlNodeToMarkdown(el: HTMLElement | ChildNode): string {
  if (el.nodeType === Node.TEXT_NODE) {
    return el.textContent || "";
  }

  const tag = (el as HTMLElement).tagName?.toUpperCase();
  const children = Array.from(el.childNodes)
    .map((c) => htmlNodeToMarkdown(c))
    .join("");

  switch (tag) {
    case "P":
      return `\n\n${children}\n\n`;
    case "STRONG":
    case "B":
      return `**${children}**`;
    case "EM":
    case "I":
      return `*${children}*`;
    case "UL":
      return `\n${children}\n`;
    case "OL":
      return `\n${children}\n`;
    case "LI":
      return `- ${children}\n`;
    case "BR":
      return "\n";
    case "A": {
      const href = (el as HTMLAnchorElement).getAttribute("href") || "";
      return `[${children}](${href})`;
    }
    default:
      return children;
  }
}

export async function convertDocxToSections(file: File): Promise<LectureSection[]> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  return splitHtmlToSections(result.value);
}

export async function convertPdfToSections(file: File): Promise<LectureSection[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const sections: LectureSection[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .trim();

    if (pageText) {
      sections.push({
        id: generateSectionId(),
        title: `Page ${i}`,
        content: pageText,
      });
    }
  }

  if (sections.length === 0) {
    sections.push({
      id: generateSectionId(),
      title: "Section 1",
      content: "No text could be extracted from this PDF.",
    });
  }

  return sections;
}

export async function convertFileToSections(file: File): Promise<LectureSection[]> {
  const mime = file.type;

  if (mime === "application/pdf") {
    return convertPdfToSections(file);
  }

  if (
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return convertDocxToSections(file);
  }

  throw new Error(`Unsupported file type: ${mime}`);
}
