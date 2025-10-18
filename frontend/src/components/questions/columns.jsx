"use client";

import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "./data-table-column-header";
import { useNavigate } from "react-router-dom";

// Difficulty colors for visual cues
const difficultyColors = {
  Easy: "bg-green-100 text-green-800 border-green-300",
  Medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
  Hard: "bg-red-100 text-red-800 border-red-300",
};

// Custom order for sorting difficulty
const difficultyOrder = { Easy: 1, Medium: 2, Hard: 3 };

export const columns = [
  {
    accessorKey: "QID",
    header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />,
    cell: ({ row }) => <RowCell row={row} field="QID" />,
    meta: { width: "40px" }, // fixed width
  },
  {
    accessorKey: "title",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Title" />,
    cell: ({ row }) => <RowCell row={row} field="title" />,
    meta: { width: "200px" },
  },
  {
    accessorKey: "difficulty",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Difficulty" />,
    cell: ({ row }) => {
      const difficulty = row.getValue("difficulty");
      const colorClass = difficultyColors[difficulty] || "bg-gray-100 text-gray-700";
      return (
        <RowCell row={row}>
          <Badge variant="outline" className={colorClass}>
            {difficulty}
          </Badge>
        </RowCell>
      );
    },
    // Custom sort to respect Easy → Medium → Hard
    sortingFn: (a, b) =>
      difficultyOrder[a.getValue("difficulty")] - difficultyOrder[b.getValue("difficulty")],
    meta: { width: "60px" },
  },
  {
    accessorKey: "topics",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Topics" />,
    cell: ({ row }) => {
      const topics = row.getValue("topics");
      if (!topics || !Array.isArray(topics)) return null;
      return (
        <RowCell row={row}>
          <div className="flex flex-wrap gap-1">
            {topics.map((topic) => (
              <Badge key={topic} variant="secondary" className="text-xs">
                {topic}
              </Badge>
            ))}
          </div>
        </RowCell>
      );
    },
    meta: { width: "250px" },
  },
];

// Wrap row content in a clickable div
function RowCell({ row, children, field }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(`/question/${row.original.QID}`)}
      className="cursor-pointer hover:bg-gray-50 p-2 transition duration-150"
    >
      {children ?? row.getValue(field)}
    </div>
  );
}

