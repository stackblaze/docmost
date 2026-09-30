import { Button, Table, TextInput } from "@mantine/core";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import api from "@/lib/api-client";

export function BaseView({
  pageId,
  embedded: _embedded,
  editable,
  titleSlot,
}: {
  pageId: string;
  embedded?: boolean;
  editable?: boolean;
  titleSlot?: ReactNode;
}) {
  const [base, setBase] = useState<any>(null);
  const [name, setName] = useState("Name");

  const load = async () => {
    const req = await api.post("/bases/info", { pageId });
    setBase(req.data);
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [pageId]);

  if (!base) {
    return (
      <Button onClick={() => api.post("/bases/convert", { pageId }).then(load)}>
        Convert to base
      </Button>
    );
  }

  return (
    <div>
      {titleSlot}
      {editable !== false && (
        <>
          <TextInput value={name} onChange={(e) => setName(e.currentTarget.value)} />
          <Button
            my="sm"
            onClick={() =>
              api.post("/bases/properties/create", { pageId, name, type: "text" }).then(load)
            }
          >
            Add property
          </Button>
          <Button
            my="sm"
            ml="sm"
            onClick={() => api.post("/bases/rows/create", { pageId, cells: {} }).then(load)}
          >
            Add row
          </Button>
        </>
      )}
      <Table>
        <Table.Thead>
          <Table.Tr>
            {(base.properties || []).map((p: any) => (
              <Table.Th key={p.id}>{p.name}</Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {(base.rows || []).map((row: any) => (
            <Table.Tr key={row.id}>
              {(base.properties || []).map((p: any) => (
                <Table.Td key={p.id}>{row.cells?.[p.id] ?? ""}</Table.Td>
              ))}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </div>
  );
}

export function BaseTableSkeleton({
  rows,
  columns,
}: {
  rows?: number;
  columns?: number;
}) {
  return <div>Loading base…{rows && columns ? ` ${rows}x${columns}` : ""}</div>;
}
