export function runInBackground(task: () => Promise<void>, label: string) {
  void task().catch((error) => {
    console.error(`${label} failed`, error);
  });
}
