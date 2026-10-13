import clang.cindex

def find_checkpoints(filepath):
    # Initialize clang parser
    index = clang.cindex.Index.create()
    tu = index.parse(filepath)
    checkpoints = []

    # Recursive AST traversal
    def walk(node):
        if node.kind == clang.cindex.CursorKind.FOR_STMT:
            # Checkpoint: line after the loop
            line = node.extent.end.line + 1 
            checkpoints.append({"line": line, "variable": "sum", "rule": "loop_end"})
        for child in node.get_children():
            walk(child)
            
    walk(tu.cursor)
    return checkpoints
