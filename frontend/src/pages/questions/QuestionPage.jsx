import { columns as baseColumns } from "@/components/questions/columns";
import { DataTable } from "@/components/questions/data-table";
import MainLayout from "@/layout/MainLayout";
import { getQuestions } from "@/lib/getQuestions";
import { useEffect, useState } from "react";

export default function QuestionPage() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await getQuestions();
        if (data?.length) setQuestions(data);
        else if (data?.questions?.length) setQuestions(data.questions);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <MainLayout>
      <div className="h-full flex-1 flex-col p-8 md:flex">
        <div className="mb-6 border-b pb-4">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Question Bank
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Practice problems to prepare for interviews — filter by difficulty
            or topic.
          </p>
        </div>

        {loading ? (
          <p>Loading questions...</p>
        ) : (
          <DataTable
            data={questions}
            columns={baseColumns}
            getRowProps={(row) => ({
              onClick: () => handleRowClick(row.original),
              className:
                "cursor-pointer hover:bg-gray-50 transition duration-150",
            })}
          />
        )}
      </div>
    </MainLayout>
  );
}
