import { ReminderRunnerService } from "./reminder-runner.service";
describe("ReminderRunnerService",()=>{
 afterEach(()=>jest.useRealTimers());
 it("runs production reminders immediately and every fifteen minutes, then clears the timer",async()=>{
  jest.useFakeTimers();const sendEventReminders=jest.fn().mockResolvedValue({});
  const runner=new ReminderRunnerService({sendEventReminders} as any,{get:(key:string)=>key==="NODE_ENV"?"production":undefined} as any);
  runner.onModuleInit();await Promise.resolve();expect(sendEventReminders).toHaveBeenCalledTimes(1);
  await jest.advanceTimersByTimeAsync(15*60*1000);expect(sendEventReminders).toHaveBeenCalledTimes(2);
  runner.onModuleDestroy();await jest.advanceTimersByTimeAsync(15*60*1000);expect(sendEventReminders).toHaveBeenCalledTimes(2);
 });
 it.each(["test","development"])("does not send anything automatically in %s",environment=>{
  jest.useFakeTimers();const sendEventReminders=jest.fn();const runner=new ReminderRunnerService({sendEventReminders} as any,{get:(key:string)=>key==="NODE_ENV"?environment:undefined} as any);
  runner.onModuleInit();expect(sendEventReminders).not.toHaveBeenCalled();expect(jest.getTimerCount()).toBe(0);
 });
 it("prevents overlapping runs",async()=>{
  let finish!:()=>void;const sendEventReminders=jest.fn(()=>new Promise<void>(resolve=>finish=resolve));const runner=new ReminderRunnerService({sendEventReminders} as any,{} as any);
  const first=runner.run();await runner.run();expect(sendEventReminders).toHaveBeenCalledTimes(1);finish();await first;
 });
});
