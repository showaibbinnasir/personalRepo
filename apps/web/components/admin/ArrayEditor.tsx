"use client";

import { useState } from "react";
import ImageUploader from "./ImageUploader";
import RichTextEditor from "./RichTextEditor";

type FieldType =
  | "text"
  | "textarea"
  | "checkbox"
  | "lines"
  | "csv"
  | "image"
  | "richtext";

type Field = {
  key: string;
  label: string;
  type?: FieldType;
  full?: boolean;
};

type Props = {
  title: string;
  items: any[];
  onChange: (items: any[]) => void;
  fields: Field[];
  blank: Record<string, any>;
  labelKey: string;

  /*
   * Optional accordion mode.
   * We will enable this only for Projects.
   */
  collapsible?: boolean;
};

export default function ArrayEditor({
  title,
  items,
  onChange,
  fields,
  blank,
  labelKey,
  collapsible = false,
}: Props) {
  /*
   * Stores indexes of currently opened entries.
   *
   * Because Projects will use collapsible=true,
   * they start collapsed.
   */
  const [openIndexes, setOpenIndexes] =
    useState<Set<number>>(new Set());

  /*
   * UPDATE ONE FIELD
   */
  function updateItem(
    index: number,
    key: string,
    value: any,
  ) {
    const updated = [...items];

    updated[index] = {
      ...updated[index],
      [key]: value,
    };

    onChange(updated);
  }

  /*
   * ADD
   */
  function addItem() {
    const newItem = {
      ...blank,
      id: crypto.randomUUID(),
      /*
       * These are useful because your public
       * portfolio already uses visible/order.
       */
      visible:
        blank.visible !== undefined
          ? blank.visible
          : true,

      order:
        blank.order !== undefined
          ? blank.order
          : items.length,
    };

    const newIndex = items.length;

    onChange([
      ...items,
      newItem,
    ]);

    /*
     * Automatically open the newly-created project.
     */
    if (collapsible) {
      setOpenIndexes(
        (previous) => {
          const next =
            new Set(previous);

          next.add(newIndex);

          return next;
        },
      );
    }
  }

  /*
   * DELETE
   */
  function deleteItem(
    index: number,
  ) {
    const confirmed =
      window.confirm(
        `Delete this ${title.toLowerCase()}?`,
      );

    if (!confirmed) return;

    const updated =
      items.filter(
        (_, itemIndex) =>
          itemIndex !== index,
      );

    onChange(updated);

    /*
     * Fix accordion indexes after deletion.
     */
    setOpenIndexes(
      (previous) => {
        const next =
          new Set<number>();

        previous.forEach(
          (openIndex) => {
            if (
              openIndex < index
            ) {
              next.add(
                openIndex,
              );
            } else if (
              openIndex > index
            ) {
              next.add(
                openIndex - 1,
              );
            }
          },
        );

        return next;
      },
    );
  }

  /*
   * MOVE UP / DOWN
   */
  function moveItem(
    index: number,
    direction:
      | "up"
      | "down",
  ) {
    const targetIndex =
      direction === "up"
        ? index - 1
        : index + 1;

    if (
      targetIndex < 0 ||
      targetIndex >=
      items.length
    ) {
      return;
    }

    const updated = [
      ...items,
    ];

    [
      updated[index],
      updated[targetIndex],
    ] = [
        updated[targetIndex],
        updated[index],
      ];

    /*
     * Recalculate order.
     */
    const reordered =
      updated.map(
        (item, itemIndex) => ({
          ...item,
          order: itemIndex,
        }),
      );

    onChange(reordered);

    /*
     * Move accordion state with project.
     */
    setOpenIndexes(
      (previous) => {
        const next =
          new Set<number>();

        previous.forEach(
          (openIndex) => {
            if (
              openIndex ===
              index
            ) {
              next.add(
                targetIndex,
              );
            } else if (
              openIndex ===
              targetIndex
            ) {
              next.add(
                index,
              );
            } else {
              next.add(
                openIndex,
              );
            }
          },
        );

        return next;
      },
    );
  }

  /*
   * OPEN / CLOSE
   */
  function toggleItem(
    index: number,
  ) {
    setOpenIndexes(
      (previous) => {
        const next =
          new Set(previous);

        if (
          next.has(index)
        ) {
          next.delete(index);
        } else {
          next.add(index);
        }

        return next;
      },
    );
  }

  function expandAll() {
    setOpenIndexes(
      new Set(
        items.map(
          (_, index) =>
            index,
        ),
      ),
    );
  }

  function collapseAll() {
    setOpenIndexes(
      new Set(),
    );
  }

  /*
   * FIELD RENDERER
   */
  function renderField(
    item: any,
    field: Field,
    index: number,
  ) {
    const value =
      item[field.key];

    /*
     * CHECKBOX
     */
    if (
      field.type ===
      "checkbox"
    ) {
      return (
        <label className="admin-checkbox">
          <input
            type="checkbox"
            checked={Boolean(
              value,
            )}
            onChange={(
              event,
            ) =>
              updateItem(
                index,
                field.key,
                event.target
                  .checked,
              )
            }
          />

          <span>
            {field.label}
          </span>
        </label>
      );
    }

    /*
     * TEXTAREA
     */
    if (
      field.type ===
      "textarea"
    ) {
      return (
        <div
          className={`field ${field.full
              ? "full"
              : ""
            }`}
        >
          <label>
            {field.label}
          </label>

          <textarea
            value={
              value || ""
            }
            onChange={(
              event,
            ) =>
              updateItem(
                index,
                field.key,
                event.target
                  .value,
              )
            }
          />
        </div>
      );
    }

    /*
     * MULTILINE ARRAY
     */
    if (
      field.type ===
      "lines"
    ) {
      return (
        <div
          className={`field ${field.full
              ? "full"
              : ""
            }`}
        >
          <label>
            {field.label}
          </label>

          <textarea
            value={
              Array.isArray(
                value,
              )
                ? value.join(
                  "\n",
                )
                : ""
            }
            placeholder={
              "One item per line"
            }
            onChange={(
              event,
            ) =>
              updateItem(
                index,
                field.key,
                event.target.value.split(
                  "\n",
                ),
              )
            }
          />
        </div>
      );
    }

    /*
     * COMMA-SEPARATED ARRAY
     */
    if (
      field.type === "csv"
    ) {
      return (
        <div
          className={`field ${field.full
              ? "full"
              : ""
            }`}
        >
          <label>
            {field.label}
          </label>

          <input
            value={
              Array.isArray(
                value,
              )
                ? value.join(
                  ", ",
                )
                : ""
            }
            placeholder="React, Next.js, MongoDB"
            onChange={(
              event,
            ) =>
              updateItem(
                index,
                field.key,
                event.target.value
                  .split(",")
                  .map(
                    (entry) =>
                      entry.trim(),
                  )
                  .filter(
                    Boolean,
                  ),
              )
            }
          />
        </div>
      );
    }

    /*
     * IMAGE
     */
    if (
      field.type ===
      "image"
    ) {
      return (
        <div
          className={`field ${field.full
              ? "full"
              : ""
            }`}
        >
          <label>
            {field.label}
          </label>

          <ImageUploader
            value={
              value || ""
            }
            onChange={(
              newValue,
            ) =>
              updateItem(
                index,
                field.key,
                newValue,
              )
            }
          />
        </div>
      );
    }

    /*
     * RICH TEXT / BLOG
     */
    if (
      field.type ===
      "richtext"
    ) {
      return (
        <div
          className={`field ${field.full
              ? "full"
              : ""
            }`}
        >
          <label>
            {field.label}
          </label>

          <RichTextEditor
            value={
              value || ""
            }
            onChange={(
              newValue,
            ) =>
              updateItem(
                index,
                field.key,
                newValue,
              )
            }
          />
        </div>
      );
    }

    /*
     * NORMAL INPUT
     */
    return (
      <div
        className={`field ${field.full
            ? "full"
            : ""
          }`}
      >
        <label>
          {field.label}
        </label>

        <input
          value={
            value ?? ""
          }
          onChange={(
            event,
          ) =>
            updateItem(
              index,
              field.key,
              event.target
                .value,
            )
          }
        />
      </div>
    );
  }

  return (
    <div className="array-editor">
      {/* TOP TOOLBAR */}

      <div className="array-editor-top">
        <div>
          <h3>
            {title}
          </h3>

          <small>
            {items.length}{" "}
            {items.length ===
              1
              ? "entry"
              : "entries"}
          </small>
        </div>

        <div className="array-editor-top-actions">
          {collapsible &&
            items.length >
            0 && (
              <>
                <button
                  type="button"
                  className="admin-secondary-button"
                  onClick={
                    expandAll
                  }
                >
                  Expand all
                </button>

                <button
                  type="button"
                  className="admin-secondary-button"
                  onClick={
                    collapseAll
                  }
                >
                  Collapse all
                </button>
              </>
            )}

          <button
            type="button"
            className="admin-add-button"
            onClick={
              addItem
            }
          >
            + Add {title}
          </button>
        </div>
      </div>

      {/* ITEMS */}

      <div className="array-editor-items">
        {items.map(
          (item, index) => {
            const isOpen =
              !collapsible ||
              openIndexes.has(
                index,
              );

            const itemLabel =
              item[labelKey] ||
              `Untitled ${title}`;

            return (
              <article
                className={`admin-array-item ${collapsible
                    ? "collapsible"
                    : ""
                  } ${isOpen
                    ? "is-open"
                    : ""
                  }`}
                key={
                  item.id ||
                  item._id ||
                  index
                }
              >
                {/* ACCORDION HEADER */}

                <div className="admin-array-header">
                  {collapsible ? (
                    <button
                      type="button"
                      className="admin-accordion-toggle"
                      onClick={() =>
                        toggleItem(
                          index,
                        )
                      }
                      aria-expanded={
                        isOpen
                      }
                    >
                      <span className="admin-accordion-index">
                        {String(
                          index +
                          1,
                        ).padStart(
                          2,
                          "0",
                        )}
                      </span>

                      <span className="admin-accordion-info">
                        <strong>
                          {
                            itemLabel
                          }
                        </strong>

                        <small>
                          {item.category ||
                            item.organization ||
                            item.institution ||
                            ""}
                        </small>
                      </span>

                      <span className="admin-project-badges">
                        {item.featured && (
                          <span className="admin-badge featured">
                            Featured
                          </span>
                        )}

                        {item.visible ===
                          false && (
                            <span className="admin-badge hidden">
                              Hidden
                            </span>
                          )}
                      </span>

                      <span className="admin-accordion-arrow">
                        ↓
                      </span>
                    </button>
                  ) : (
                    <div className="admin-standard-item-title">
                      <span>
                        {String(
                          index +
                          1,
                        ).padStart(
                          2,
                          "0",
                        )}
                      </span>

                      <strong>
                        {
                          itemLabel
                        }
                      </strong>
                    </div>
                  )}

                  {/* ITEM ACTIONS */}

                  <div className="admin-item-actions">
                    <button
                      type="button"
                      title="Move up"
                      disabled={
                        index === 0
                      }
                      onClick={() =>
                        moveItem(
                          index,
                          "up",
                        )
                      }
                    >
                      ↑
                    </button>

                    <button
                      type="button"
                      title="Move down"
                      disabled={
                        index ===
                        items.length -
                        1
                      }
                      onClick={() =>
                        moveItem(
                          index,
                          "down",
                        )
                      }
                    >
                      ↓
                    </button>

                    {"visible" in
                      item && (
                        <button
                          type="button"
                          className={
                            item.visible ===
                              false
                              ? "visibility-off"
                              : ""
                          }
                          title={
                            item.visible ===
                              false
                              ? "Show item"
                              : "Hide item"
                          }
                          onClick={() =>
                            updateItem(
                              index,
                              "visible",
                              item.visible ===
                              false,
                            )
                          }
                        >
                          {item.visible ===
                            false
                            ? "○"
                            : "●"}
                        </button>
                      )}

                    <button
                      type="button"
                      className="delete"
                      title="Delete"
                      onClick={() =>
                        deleteItem(
                          index,
                        )
                      }
                    >
                      ×
                    </button>
                  </div>
                </div>

                {/* CONTENT */}

                {isOpen && (
                  <div className="admin-array-body">
                    <div className="field-grid">
                      {fields.map((field) => (
                        <div
                          key={field.key}
                          className={
                            field.full
                              ? "field-grid-item full"
                              : "field-grid-item"
                          }
                        >
                          {renderField(
                            item,
                            field,
                            index
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            );
          },
        )}

        {items.length ===
          0 && (
            <div className="admin-empty-state">
              <p>
                No {title.toLowerCase()}{" "}
                entries yet.
              </p>

              <button
                type="button"
                className="admin-add-button"
                onClick={
                  addItem
                }
              >
                + Add {title}
              </button>
            </div>
          )}
      </div>
    </div>
  );
}