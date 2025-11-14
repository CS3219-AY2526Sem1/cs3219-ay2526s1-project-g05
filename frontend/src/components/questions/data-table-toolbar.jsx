"use client";

import { useState } from "react";
import { X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function DataTableToolbar({ table }) {
  const isFiltered = table.getState().columnFilters.length > 0;

  // Local sort state
  const [sortField, setSortField] = useState("difficulty");
  const [sortOrder, setSortOrder] = useState("asc");

  // Define sort options
  const sortFields = [
    { value: "id", label: "Question ID" },
    { value: "title", label: "Title" },
    { value: "difficulty", label: "Difficulty" },
    { value: "topics", label: "Topics" },
  ];

  const handleSortChange = (field) => {
    setSortField(field);
    table.setSorting([{ id: field, desc: sortOrder === "desc" }]);
  };

  const handleOrderChange = (order) => {
    setSortOrder(order);
    table.setSorting([{ id: sortField, desc: order === "desc" }]);
  };

  return (
    <div className="flex items-center justify-between">
      {/* Left side: search + sort */}
      <div className="flex flex-1 items-center gap-2">
        {/* 🔍 Search input */}
        <Input
          placeholder="Search questions..."
          value={table.getColumn("title")?.getFilterValue() ?? ""}
          onChange={(event) =>
            table.getColumn("title")?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />

        {/* ⚙️ Sort dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <Filter className="mr-2 h-4 w-4" />
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={sortField}
              onValueChange={handleSortChange}
            >
              {sortFields.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>

            <DropdownMenuSeparator />

            <DropdownMenuLabel>Order</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={sortOrder}
              onValueChange={handleOrderChange}
            >
              <DropdownMenuRadioItem value="asc">Ascending ↑</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="desc">Descending ↓</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Reset filters */}
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => table.resetColumnFilters()}
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Right side: view options (optional) */}
      {/* <div className="flex items-center gap-2">
        <DataTableViewOptions table={table} />
      </div> */}
    </div>
  );
}
