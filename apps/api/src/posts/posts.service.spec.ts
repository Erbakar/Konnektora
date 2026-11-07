import { PostsService } from "./posts.service";
function setup(visibility="everybody") {
 const prisma={post:{findUnique:jest.fn().mockResolvedValue({id:"post",authorId:"owner",visibility,status:"active"})},userFollow:{findMany:jest.fn().mockResolvedValue([])},userBlock:{findMany:jest.fn().mockResolvedValue([])},postComment:{findMany:jest.fn().mockResolvedValue([])},mediaFile:{findMany:jest.fn().mockResolvedValue([])}};
 return {prisma,service:new PostsService(prisma as never,{} as never)};
}
describe("post privacy enforcement",()=>{
 it("rejects blocked access even for an everybody post",async()=>{const{prisma,service}=setup();prisma.userBlock.findMany.mockResolvedValue([{userId:"owner",targetId:"viewer"}]);await expect(service.comments("post",{id:"viewer"} as never)).rejects.toThrow();expect(prisma.postComment.findMany).not.toHaveBeenCalled();});
 it("allows only the owner's selected following audience",async()=>{const{prisma,service}=setup("following");await expect(service.comments("post",{id:"viewer"} as never)).rejects.toThrow();prisma.userFollow.findMany.mockResolvedValueOnce([{followerId:"owner"}]).mockResolvedValueOnce([]);await expect(service.comments("post",{id:"viewer"} as never)).resolves.toEqual([]);});
 it("does not treat first-degree following as second-degree network",async()=>{const{prisma,service}=setup("network");prisma.userFollow.findMany.mockResolvedValueOnce([{followerId:"owner"}]).mockResolvedValueOnce([]);await expect(service.comments("post",{id:"viewer"} as never)).rejects.toThrow();prisma.userFollow.findMany.mockResolvedValueOnce([{followerId:"middle"}]).mockResolvedValueOnce([{followerId:"owner"}]);await expect(service.comments("post",{id:"viewer"} as never)).resolves.toEqual([]);});
 it("lets anonymous readers access only public posts",async()=>{await expect(setup().service.comments("post")).resolves.toEqual([]);await expect(setup("following").service.comments("post")).rejects.toThrow();});
});
